const lib = require("./head")
const path = require("path")
const fs = require("fs")

lib.load = function (filename)
{
    let full_path = path.resolve(filename)

    let content = fs.readFileSync(full_path).toString("utf8")

    return lib.parse(content)
}

