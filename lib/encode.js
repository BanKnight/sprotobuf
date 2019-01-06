let lib = require("./head")

let encoder = {}

lib.to_buf = function (root, writer, name, obj)
{
    encoder.obj_to_buf(root, writer, name, obj)
}

encoder.obj_to_buf = function (root, writer, name, obj)
{
    let message = root.types.get(name)
    if (message == null)
    {
        throw Error("no such message:" + name)
    }

    let pos = writer.offset

    writer.append_uint16(0)     //占用位置,这里写长度

    let len = 0
    for (let key in obj)
    {
        let field = message.fields.get(key)

        if (field == null)
        {
            continue
        }

        let val = obj[key]

        encoder.write_field(root, writer, field, val)

        len++
    }

    writer.replace_uint16(len, pos)
}

encoder.write_field = function (root, writer, field, target)
{
    writer.append_uint8(field.id)

    if (field.key === undefined)
    {
        encoder.write_val(root, writer, field.val, target)
    }
    else if (field.key === false)   //array
    {
        writer.append_uint16(target.length)
        for (let one of target)
        {
            encoder.write_val(root, writer, field.val, one)
        }
    }
    else    //map
    {
        if (target instanceof Map)
        {
            writer.append_uint16(target.size)

            for (let [key, val] of target)
            {
                encoder.write_val(root, writer, field.key, key)
                encoder.write_val(root, writer, field.val, val)
            }
        }
        else
        {
            let pos = writer.offset
            let len = 0

            writer.append_uint16(len)

            for (let key in target)
            {
                let val = target[key]

                encoder.write_val(root, writer, field.key, key)
                encoder.write_val(root, writer, field.val, val)

                len++
            }

            writer.replace_uint16(len, pos)
        }
    }
}

encoder.write_val = function (root, writer, tp, val)
{

    switch (tp)
    {
        case "double":   // 0
        case "float":    // 1
            writer.append_double(val)
            break
        case "int32":    // 2
        case "sint32":   // 4
        case "sfixed32": // 6
            writer.append_int32(val)
            break
        case "uint32":   // 3
        case "fixed32":  // 5
            writer.append_uint32(val)
            break
        case "int64":    // 7
        case "uint64":   // 8
        case "sint64":   // 9
        case "fixed64":  // 10
        case "sfixed64": // 11
            writer.append_int64(val)
            break
        case "bool":     // 12
            writer.append_uint8(val ? 1 : 0)
            break
        case "string":   // 13
            writer.append_string(val)
            break
        case "bytes":     // 14
            writer.append_bytes(val)
            break
        default:
            {
                encoder.obj_to_buf(root, writer, tp, val)
            }
    }
}


