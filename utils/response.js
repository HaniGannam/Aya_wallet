class CommonRes {
    constructor(message) {
        this.message = {
            response: 'success',
            message: message
        };
    }
}

class ErrorRes {
    constructor(message) {
        this.message = {
            response: 'failed',
            message: message
        };
    }
}

module.exports = {
    CommonRes: CommonRes,
    ErrorRes:ErrorRes
}