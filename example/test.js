const sprotobuf = require("../lib")

const proto = `
message error
{
    int32 code = 1
    string reason = 2
}
message call
{
    uint32 service = 1
    uint32 method = 2
    uint32 session = 3
    bytes req = 4
}
message response
{
    uint32 session = 1
    error err = 2
    bytes resp = 3
}
message invoke
{
    uint32 service = 1
    uint32 method = 2
    bytes req = 3
}
message net_data
{
    call ca = 1
    invoke inv = 2
    response resp = 3
}

message example_test
{
    [int32] int_vals = 5
    <string,int32> map_val = 6
}

service example
{
    option id = 1
    rpc test (void) returns (mbool)
    {
        option id = 1
    }
    rpc echo(mstring) returns(mstring)
    {
        option id = 2
    }
}

service chat
{
    option id = 2
    rpc speak(mstring) returns(mbool)
    {
        option id = 1
    }
}

message mstring
{
    string val = 1
}

message mbool
{
    bool val = 1
}

message void
{

}
`

sprotobuf.parse(proto)