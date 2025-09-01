const jwt = require('jsonwebtoken')

const sendToken = async (user, res, status, message) => {
    try {
        //Generate JWT Token
        const token = jwt.sign({ id: user }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_TIME
        })

        const options = {
            httpOnly: true,
            secure: true,
            // production 
            sameSite: 'None',
            // local 
            // sameSite: 'Lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        };


        // Send token in cookie
        res.status(status).cookie('token', token, options).json({
            success: true,
            message,
            token,
            user
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

module.exports = sendToken;