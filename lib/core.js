const lib = require("./head")

lib.load = function (filename)
{
    const path = require("path")
    const fs = require("fs")

    let full_path = path.resolve(filename)

    let content = fs.readFileSync(full_path).toString("utf8")

    return lib.parse(content)
}

