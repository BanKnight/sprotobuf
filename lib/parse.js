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


lib.parse = function (source)
{
    const proto = {
        types: new Map(),
        services: new Map(),
    }

    let offset = 0
    let length = source.length
    let line = 0
    let curr = undefined
    let prev = undefined
    let repeat = undefined

    function illegal(subject)
    {
        return Error("illegal " + subject + " (line " + line + ")");
    }
    function next()
    {
        do
        {
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
                    while (charAt(++offset) !== "\n")
                    {
                        if (offset === length)
                        {
                            return null;
                        }
                    }
                    ++line;
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
        // if (token === "\"" || token === "'")
        //     stringDelim = token;
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

    function parseCommon(token)
    {
        switch (token)
        {
            case "option":
                parseOption(parent, token);
                return true;
            case "message":
                parseMessage(token);
                return true;

            case "enum":
                parseEnum(token);
                return true;

            case "service":
                parseService(token);
                return true;
        }
        return false;
    }

    let token;
    let head = true

    while ((token = next()) !== null)
    {
        switch (token)
        {
            case "option":
                parseOption(parent, token);
                skip(";");
                return true;
            default:

                /* istanbul ignore else */
                if (parseCommon(token))
                {
                    head = false;
                    continue;
                }

                /* istanbul ignore next */
                throw illegal(token);
        }
        return false
    }

    function parseOption(token)
    {
        var isCustom = skip("(", true);

        /* istanbul ignore if */
        if (!typeRefRe.test(token = next()))
            throw illegal(token, "name");

        var name = token;
        if (isCustom)
        {
            skip(")");
            name = "(" + name + ")";
            token = peek();
            if (fqTypeRefRe.test(token))
            {
                name += token;
                next();
            }
        }
        skip("=");
        parseOptionValue(parent, name);
    }

    function parseMessage(token)
    {
        if (!nameRe.test(token = next()))
            throw illegal(token, "type name");

        const type = {
            name: token,
            fields: {},
            id_fields: {},
        }

        skip("{")

        while ((token = next()) != "}")
        {
            if (parseCommon(type, token))
                break;

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

        if (proto.types.get(type.name) != null)
        {
            illegal(type.name)
        }

        proto.types.set(type.name, type)
    }

    function parseEnum()
    {

    }

    function parseService(token)
    {
        /* istanbul ignore if */
        if (!nameRe.test(token = next()))
            throw illegal(token, "service name");

        let service = {
            name: token,
        }

        var service = new Service(token);
        ifBlock(service, function parseService_block(token)
        {
            if (parseCommon(service, token))
                return;

            /* istanbul ignore else */
            if (token === "rpc")
                parseMethod(service, token);
            else
                throw illegal(token);
        });
        parent.add(service);
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

        if (s.indexOf(valueType) == -1 && proto.types.get(valueType) == null)
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

        type.fields[field.name] = field
        type.id_fields[field.id] = field
    }

    function parseArrayField(type, token)
    {
        let valueType = next();

        /* istanbul ignore if */
        if (!typeRefRe.test(valueType))
            throw illegal(valueType, "type");

        if (s.indexOf(valueType) == -1 && proto.types.get(valueType) == null)
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

        type.fields[field.name] = field
        type.id_fields[field.id] = field
    }

    function parseField(type, token)
    {
        let valueType = token

        /* istanbul ignore if */
        if (!typeRefRe.test(valueType))
            throw illegal(valueType);

        if (s.indexOf(valueType) == -1 && proto.types.get(valueType) == null)
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

        type.fields[field.name] = field
        type.id_fields[field.id] = field
    }



    return true
}