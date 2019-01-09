let lib = require("./head")

let encoder = {}

lib.to_msg = function (root, writer, name, obj)
{
    let message = root.messages.get(name)
    if (message == null)
    {
        throw Error("no such message:" + name)
    }

    encoder.obj_to_msg(root, writer, message, obj)
}

lib.to_rpc = function (root, writer, name, ...args)
{
    let array = name.split(".")
    let service_name = array[0]
    let method_name = array[1]

    let service = root.services.get(service_name)
    if (service == null)
    {
        throw Error("no such service:" + service_name)
    }

    let method = service.methods.get(method_name)
    if (method == null)
    {
        throw Error("no such method:" + name)
    }

    if (args.length < method.req.length)
    {
        throw Error("more params required:" + name)
    }

    writer.append_uint32(service.id << 16 | method.id)

    let pos = writer.offset
    let len = 0

    writer.append_uint8(0)

    //以下这么写是为了可以实现null
    for (let i = 0; i < method.req.length; ++i)
    {
        let arg = args[i]
        if (arg == null)
        {
            continue
        }

        writer.append_uint8(i)
        encoder.write_type(root, writer, method.req[i], arg)

        len++
    }

    writer.replace_uint8(len, pos)
}

lib.to_resp = function (root, writer, name, ret)
{
    let array = name.split(".")
    let service_name = array[0]
    let method_name = array[1]

    let service = root.services.get(service_name)
    if (service == null)
    {
        throw Error("no such service:" + service_name)
    }

    let method = service.methods.get(method_name)
    if (method == null)
    {
        throw Error("no such method:" + name)
    }

    if (method.resp)
    {
        encoder.write_type(root, writer, method.resp, ret)
    }
}

lib.to_error = function (root, writer, code, reason)
{
    writer.append_uint16(code)
    writer.append_string(reason)
}

encoder.obj_to_msg = function (root, writer, message, obj)
{

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

        writer.append_uint8(field.id)

        encoder.write_type(root, writer, field, val)

        len++
    }

    writer.replace_uint16(len, pos)
}

encoder.write_type = function (root, writer, tp, target)
{
    if (tp.key === undefined)
    {
        encoder.write_val(root, writer, tp.val || tp, target)
    }
    else if (tp.key === false)   //array
    {
        writer.append_uint16(target.length)
        for (let one of target)
        {
            encoder.write_val(root, writer, tp.val, one)
        }
    }
    else    //map
    {
        if (target instanceof Map)
        {
            writer.append_uint16(target.size)

            for (let [key, val] of target)
            {
                encoder.write_val(root, writer, tp.key, key)
                encoder.write_type(root, writer, tp.val, val)
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

                encoder.write_val(root, writer, tp.key, key)
                encoder.write_type(root, writer, tp.val, val)

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
        case "uint8":
        case "int8":
        case "int16":   // 4
        case "uint16":  // 5
        case "int32":    // 2
        case "uint32":   // 3
        case "int64":    // 7
        case "uint64":   // 8
            writer[`append_${tp}`](val)
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
                encoder.obj_to_msg(root, writer, tp, val)
            }
    }
}


