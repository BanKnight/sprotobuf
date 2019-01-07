let box = require("buffer-op").box
let lib = require("./head")
let decoder = {}

lib.from_msg = function (root, reader, name)
{
    return decoder.buf_to_obj(root, reader, name)
}

lib.from_rpc = function (root, reader)
{
    let helper = reader.read_uint32()

    let service_id = helper >> 16
    let method_id = helper & 0xFFFF

    let service = root.services.get(service_id)
    if (service == null)
    {
        throw Error("no such service:" + service_id)
    }
    let method = service.methods.get(method_id)
    if (method == null)
    {
        throw Error("no such method:" + method)
    }

    let args = []
    let len = reader.read_uint8()

    //以下这么写是为了可以实现null
    for (let i = 0; i < method.request.length && len > 0; ++i)
    {
        let index = reader.read_uint8()
        let arg = decoder.read_val(root, reader, method.request[i])

        for (let temp = i; temp < index; ++temp)
        {
            args.push(null)
        }

        args.push(arg)

        len--
    }

    return {
        service: service.name,
        method: method.name,
        args: args
    }
}

decoder.buf_to_obj = function (root, reader, name)
{
    let message = root.messages.get(name)
    if (message == null)
    {
        throw Error("no such message:" + name)
    }

    let len = reader.read_uint16()

    let obj = {}

    for (let i = 0; i < len; ++i)
    {
        let field_id = reader.read_uint8()
        let field = message.fields.get(field_id)

        if (field == null)
        {
            throw Error("no such field id:" + field_id)
        }

        obj[field.name] = decoder.read_field(root, reader, field)
    }
    return obj
}

decoder.read_field = function (root, reader, field)
{
    if (field.key === undefined)
    {
        return decoder.read_val(root, reader, field.val)
    }

    if (field.key === false)   //array
    {
        let target = []
        let len = reader.read_uint16()

        for (let i = 0; i < len; ++i)
        {
            target.push(decoder.read_val(root, reader, field.val))
        }

        return target
    }

    let target = new Map()
    let len = reader.read_uint16()

    for (let i = 0; i < len; ++i)
    {
        let key = decoder.read_val(root, reader, field.key)
        let val = decoder.read_val(root, reader, field.val)

        target.set(key, val)
    }

    return target
}

decoder.read_val = function (root, reader, tp)
{
    let val
    switch (tp)
    {
        case "double":   // 0
        case "float":    // 1
            val = reader.read_double()
            break
        case "int32":    // 2
        case "sint32":   // 4
        case "sfixed32": // 6
            val = reader.read_int32()
            break
        case "uint32":   // 3
        case "fixed32":  // 5
            val = reader.read_uint32()
            break
        case "int64":    // 7
        case "uint64":   // 8
        case "sint64":   // 9
        case "fixed64":  // 10
        case "sfixed64": // 11
            val = reader.read_int64()
            break
        case "bool":     // 12
            val = reader.read_uint8() == 1
            break
        case "string":   // 13
            val = reader.read_string()
            break
        case "bytes":     // 14
            val = reader.read_bytes()
            break
        default:
            {
                val = decoder.buf_to_obj(root, reader, field.val)
            }
    }
    return val
}