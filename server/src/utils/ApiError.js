class ApiError extends Error{
    constructor(
        statusCode,
        message="Something went Wrong",
        errors=[],
        stack=""
    ){
//constructor ko overwrite krte h to super call krte h
super(message)
this.statusCode=statusCode,
this.data=null
this.message=message
this.success=false;
this.errors=errors

//can avoid this code
if(stack){
    this.stack=stack
}
else{
    Error.captureStackTrace(this,this.constructor)
}
    }
}

export {ApiError}