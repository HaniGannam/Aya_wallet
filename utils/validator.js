const Joi = require("joi");





module.exports = {

    schemas: {
       
    },
    validateBody: (schema) => {
        return (req, res, next) => {
            const result = schema.validate(req.body);
            if (result.error) {
                const err = result.error.details.flatMap(e => e.message.replace(/"/g, ""))
                return res.status(400).json({
                    message: err
                })
            } else {
                if (!req.value) {
                    req.value = {}
                }
                req.value['body'] = result.value;
                next();
            }
        }
    }
}
