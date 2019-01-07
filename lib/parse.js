const lib = require("./head")

const delimRe = /[\s{}=;:[\],'"()<>]/g,
    stringDoubleRe = /(?:"([^"\\]*(?:\\.[^"\\]*)*)")/g,
    stringSingleRe = /(?:'([^'\\]*(?:\\.[^'\\]*)*)')/g;

const setCommentRe = /^ *[*/]+ */,
    setCommentAltRe = /^\s*\*?\/*/,
    setCommentSplitRe = /\n/g,
    whitespaceRe = /\s/,
    unescapeRe = /\\(.?)/g;

const nameRe = /^[a-zA-Z_][a-zA-Z_0-9]*$/,
    typeRefRe = /^(?:\.?[a-zA-Z_][a-zA-Z_0-9]*)(?:\.[a-zA-Z_][a-zA-Z_0-9]*)*$/


const s = [
    "double",   // 0
    "float",    // 1
    "int32",    // 2
    "uint32",   // 3
    "sint32",   // 4
    "fixed32",  // 5
    "sfixed32", // 6
    "int64",    // 7
    "uint64",   // 8
    "sint64",   // 9
    "fixed64",  // 10
    "sfixed64", // 11
    "bool",     // 12
    "string",   // 13
    "bytes"     // 14
];

function BKDRHash(str, max)
{
    max = max || 29989

    let seed = 131; // 31 131 1313 13131 131313 etc..
    let hash = 0;

    for (let i = 0; i < str.length; ++i)
    {
        hash = hash * seed + str.charCodeAt(i)
    }

    return hash % max + 1
}


lib.parse = function (source)
{
    const proto = {
        messages: new Map(),           //[name/id]
        services: new Map(),        //[name/id]
    }

    let offset = 0
    let length = source.length
    let line = 0


    function illegal(subject)
    {
        return Error("illegal " + subject + " (line " + line + ")");
    }
    function next()
    {
        let curr = undefined
        let prev = undefined
        let repeat = undefined

        do
        {
            if (offset === length)
                return null;

            repeat = false;

            while (whitespaceRe.test(curr = source.charAt(offset)))
            {
                if (curr === "\n")
                    ++line;
                if (++offset === length)
                    return null;
            }

            if (source.charAt(offset) === "/")  //comments
            {
                if (++offset === length)
                {
                    throw illegal("comment");
                }
                if (source.charAt(offset) === "/") //line
                {
                    while (source.charAt(++offset) !== "\n")
                    {
                        if (offset === length)
                        {
                            return null;
                        }
                    }
                    ++line;
                    repeat = true;
                }
                else if ((curr = source.charAt(offset)) === "*")
                {
                    do
                    {
                        if (curr === "\n")
                        {
                            ++line;
                        }
                        if (++offset === length)
                        {
                            throw illegal("comment");
                        }
                        prev = curr;
                        curr = source.charAt(offset);
                    } while (prev !== "*" || curr !== "/");
                    ++offset;
                    repeat = true;
                }
            }

        } while (repeat)

        let end = offset;
        delimRe.lastIndex = 0;
        let delim = delimRe.test(source.charAt(end++));
        if (!delim)
            while (end < length && !delimRe.test(source.charAt(end)))
                ++end;

        let token = source.substring(offset, offset = end);

        return token;
    }

    function skip(expected)
    {
        var actual = next(),
            equals = actual === expected;
        if (equals)
        {
            return true;
        }
        throw illegal("token '" + actual + "', '" + expected + "' expected");
    }

    function parseCommon(parent, token)
    {
        switch (token)
        {
            case "option":
                parseOption(parent, token);
                return true;
            case "message":
                parseMessage(parent, token);
                return true;
            case "service":
                parseService(parent, token);
                return true;
        }
        return false;
    }

    let token;

    while ((token = next()) !== null)
    {
        switch (token)      //这里的case 留作之后扩展
        {
            default:

                /* istanbul ignore else */
                if (parseCommon(proto, token))
                {
                    continue;
                }

                /* istanbul ignore next */
                throw illegal(token);
        }
    }

    function parseOption(parent, token)
    {
        /* istanbul ignore if */
        if (!typeRefRe.test(token = next()))
            throw illegal(token, "name");

        let name = token;

        skip("=");

        parent[name] = parseInt(next())
    }

    function parseMessage(parent, token)
    {
        if (!nameRe.test(token = next()))
            throw illegal(token, "type name");

        const type = {
            name: token,
            fields: new Map(),      //[name/id]
        }

        skip("{")

        while ((token = next()) != "}")
        {
            if (parseCommon(type, token))
                continue;

            switch (token)
            {
                case "<":
                    parseMapField(type, token);
                    break;
                case "[":
                    parseArrayField(type, token);
                    break
                default:
                    {
                        parseField(type, token);
                    }
            }
        }

        if (parent.messages.get(type.name) != null)
        {
            throw illegal(type.name)
        }

        parent.messages.set(type.name, type)

        if (type.id === undefined)
        {
            type.id = BKDRHash(type.name)

            while (parent.messages.get(type.id) != null)
            {
                type.id++
            }
        }
        parent.messages.set(type.id, type)
    }

    function parseService(parent, token)
    {
        /* istanbul ignore if */
        if (!nameRe.test(token = next()))
            throw illegal(token, "service name");

        let service = {
            name: token,
            methods: new Map(),     //[name/id]
        }

        skip("{")

        while ((token = next()) != "}")
        {
            if (parseCommon(service, token))
                continue;

            switch (token)
            {
                case "rpc":
                    parseMethod(service, token);

                    break
                default:
                    throw illegal(type.name)
            }
        }

        if (parent.services.get(service.name) != null)
        {
            throw illegal(services.name)
        }

        parent.services.set(service.name, service)

        if (service.id === undefined)
        {
            service.id = BKDRHash(service.name)

            while (parent.services.get(service.id) && parent.messages.get(service.id))
            {
                service.id++
            }
        }

        if (parent.services.get(service.id))
        {
            throw illegal("same id:" + service.id)
        }

        parent.services.set(service.id, service)
    }

    function parseMapField(type, token)
    {
        let keyType = next();

        if (s.indexOf(keyType) == -1)
        {
            throw illegal(keyType, "type");
        }

        skip(",");
        let valueType = next();

        /* istanbul ignore if */
        if (!typeRefRe.test(valueType))
            throw illegal(valueType, "type");

        if (s.indexOf(valueType) == -1 && proto.messages.get(valueType) == null)
        {
            throw illegal(valueType);
        }

        skip(">");
        let name = next();

        /* istanbul ignore if */
        if (!nameRe.test(name))
            throw illegal(name, "name");

        skip("=");

        let field = {
            name: name,
            id: parseInt(next()),
            key: keyType,
            val: valueType,
        }

        type.fields.set(field.name, field)
        if (type.fields.get(field.id))
        {
            throw illegal("same id:" + field.id)
        }
        type.fields.set(field.id, field)
    }

    function parseArrayField(type, token)
    {
        let valueType = next();

        /* istanbul ignore if */
        if (!typeRefRe.test(valueType))
            throw illegal(valueType, "type");

        if (s.indexOf(valueType) == -1 && proto.messages.get(valueType) == null)
        {
            throw illegal(valueType);
        }

        skip("]");
        let name = next();

        /* istanbul ignore if */
        if (!nameRe.test(name))
            throw illegal(name, "name");

        skip("=");

        let field = {
            name: name,
            id: parseInt(next()),
            key: false,
            val: valueType,
        }

        type.fields.set(field.name, field)

        if (type.fields.get(field.id))
        {
            throw illegal("same id:" + field.id)
        }

        type.fields.set(field.id, field)

    }

    function parseField(type, token)
    {
        let valueType = token

        /* istanbul ignore if */
        if (!typeRefRe.test(valueType))
            throw illegal(valueType);

        if (s.indexOf(valueType) == -1 && proto.messages.get(valueType) == null)
        {
            throw illegal(valueType);
        }

        let name = next();

        /* istanbul ignore if */
        if (!nameRe.test(name))
            throw illegal(name)

        skip("=");

        let field = {
            name: name,
            id: parseInt(next()),
            val: valueType,
        }

        type.fields.set(field.name, field)

        if (type.fields.get(field.id))
        {
            throw illegal("same id:" + field.id)
        }
        type.fields.set(field.id, field)
    }

    function parseMethod(service, token)
    {
        let name = next();

        if (!nameRe.test(name))
            throw illegal(name)

        let method = {
            name: name,
            request: [],
            response: undefined,
        }

        skip("(")
        while ((token = next()) != ")")
        {
            if (token == ",")
            {
                continue
            }

            let valueType = token

            /* istanbul ignore if */
            if (!typeRefRe.test(valueType))
                throw illegal(valueType);

            method.request.push(valueType)
        }

        skip("return")

        skip("(")

        if ((token = next()) != ")")
        {
            method.response = token
            skip(")")
        }

        skip("{")

        while ((token = next()) != "}")
        {
            if (parseCommon(method, token))
                continue;

            throw illegal(token)
        }

        service.methods.set(method.name, method)

        if (method.id === undefined)
        {
            method.id = BKDRHash(method.name)

            while (service.methods.get(method.id))
            {
                method.id++
            }
        }
        if (service.methods.get(method.id))
        {
            throw illegal("method id:" + method.id)
        }
        service.methods.set(method.id, method)
    }

    return proto
}