let lib = require("./head")
let decoder = {}

lib.from_msg = function (root, reader, name)
{
    let message = root.messages.get(name)
    if (message == null)
    {
        throw Error("no such message:" + name)
    }
    return decoder.msg_to_obj(root, reader, message)
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

    let req = {}
    let len = reader.read_uint8()

    for (let i = 0; i < len; ++i)
    {
        let index = reader.read_uint8()
        let param = method.req[index]
        let arg = decoder.read_type(root, reader, param)

        req[param.name] = arg
    }

    return {
        service: service.name,
        method: method.name,
        req: req
    }
}

lib.from_resp = function (root, reader, name)
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

    let ret = decoder.read_type(root, reader, method.resp)

    return ret
}

lib.from_error = function (root, reader)
{
    return {
        code: reader.read_uint16(),
        reason: reader.read_string()
    }
}

decoder.msg_to_obj = function (root, reader, message)
{
    let obj = {}
    let len = reader.read_uint16()
    for (let i = 0; i < len; ++i)
    {
        let field_id = reader.read_uint8()
        let field = message.fields.get(field_id)

        if (field == null)
        {
            throw Error("no such field id:" + field_id)
        }

        obj[field.name] = decoder.read_type(root, reader, field)
    }
    return obj
}

decoder.read_type = function (root, reader, tp)
{
    if (tp.key === undefined)
    {
        return decoder.read_val(root, reader, tp.val || tp)
    }

    if (tp.key === false)   //array
    {
        let target = []
        let len = reader.read_uint16()

        for (let i = 0; i < len; ++i)
        {
            target.push(decoder.read_type(root, reader, tp.val))
        }

        return target
    }

    let target = new Map()
    let len = reader.read_uint16()

    for (let i = 0; i < len; ++i)
    {
        let key = decoder.read_val(root, reader, tp.key)
        let val = decoder.read_type(root, reader, tp.val)

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
        case "uint8":
        case "int8":
        case "int16":   // 4
        case "uint16":  // 5
        case "int32":    // 2
        case "uint32":   // 3
        case "int64":    // 7
        case "uint64":   // 8
            val = reader[`read_${tp}`]()
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
                val = decoder.msg_to_obj(root, reader, tp)
            }
    }
    return val
}