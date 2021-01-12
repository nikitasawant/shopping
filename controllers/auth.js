const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const { validationResult } = require('express-validator/check')

const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport')

const User = require('../models/user');
// const SendmailTransport = require('nodemailer/lib/sendmail-transport');
// const user = require('../models/user');

const transporter = nodemailer.createTransport(sendgridTransport({
    auth: {
        api_key: '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'
    }
}))

exports.getSignup = (req,res, next) => {
    let message = req.flash('error')
    if (message.length > 0) {
        message = message[0]
    } else {
        message = null
    }
    res.render('auth/signup', {
        path: '/signup',
        pageTitle: 'Signup',
        isAuthenticated: false,
        errorMessage: message,
        oldInput: {
            email: '',
            password: '',
            confirmPassword: ''
        },
        validationErrors: []
      });
}



exports.postSignup = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword
    const errors = validationResult(req)
    // console.log(errors)

    if(!errors.isEmpty()) {
        return res.status(422)
        .render('auth/signup', {
            path: '/signup',
            pageTitle: 'Signup',
            isAuthenticated: false,
            errorMessage: errors.array()[0].msg,
            oldInput: {email: email, password: password, confirmPassword: confirmPassword},
            validationErrors: errors.array()
          }) //status 422 is error message for validation failure
    }
    bcrypt.hash(password, 12)
            .then(hashedP => {
                const user = new User({
                    email: email, 
                    password: hashedP,
                    cart: { items: [] }
                })
                return user.save()
            })
            .then(result => {
                res.redirect('/login')
                return transporter.sendMail({
                    to: email,
                    from: 'nikita.sawant1003@gmail.com',
                    subject: 'Signup Successful!',
                    html: '<h1>You have successfully signed up for shop</h1>'
                })
        })
      
}


exports.getLogin = (req, res, next) => {
    let message = req.flash('error')
    if (message.length > 0) {
        message = message[0]
    } else {
        message = null
    }
    res.render('auth/login', {
        pageTitle: 'Login',
        path: '/login',
        errorMessage: message,
        oldInput:{
            email: '',
            password: ''
        },
        validationErrors: []
})}
    

exports.postLogin = (req, res, next) => {
    const email = req.body.email
    const password = req.body.password
    const errors = validationResult(req)

    if(!errors.isEmpty()) {
        return res.status(422)
        .render('auth/login', {
            pageTitle: 'Login',
            path: '/login',
            errorMessage: errors.array()[0].msg,
            oldInput:{
                email: email,
                password: password
            },
            validationErrors: errors.array()

    })
    
    }
    User.findOne({email: email})
    .then(user => {
        if (!user) {
            return res.status(422)
        .render('auth/login', {
            pageTitle: 'Login',
            path: '/login',
            errorMessage: 'Invalid email or password',
            oldInput:{
                email: email,
                password: password
            },
            validationErrors: errors.array()
        })}
        bcrypt.compare(password, user.password)
        .then(doMatch => {
            if (doMatch){
                req.session.isLoggedIn = true
                req.session.user = user
                return req.session.save(err => {
                    console.log(err);
                    return res.redirect('/')
                })
            }return res.status(422)
            .render('auth/login', {
                pageTitle: 'Login',
                path: '/login',
                errorMessage: 'Invalid email or password',
                oldInput:{
                    email: email,
                    password: password
                },
                validationErrors: errors.array()
            })
        })
        .catch(err => {
            console.log(err);
            res.redirect('/login')
        });
        
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatuscode = 500
        return next(error)
    })
}

exports.postLogout = (req, res, next) => {
    req.session.destroy(err => {
        // console.log(err);
        res.redirect('/')
    })
}

exports.getReset = (req, res, next) => {
    let message = req.flash('error')
    if (message.length > 0) {
        message = message[0]
    } else {
        message = null
    }
    res.render('auth/reset', {
        pageTitle: 'Reset Password',
        path: '/reset',
        errorMessage: message
})}

exports.postReset = (req, res, next) => {
    
    crypto.randomBytes(32, (err, buffer) => {
        if (err) {
            console.log(err);
            console.log("Error in post reset!!!")
            return res.redirect('/reset')
        }
        const token = buffer.toString('hex');
        User.findOne({email: req.body.email})
        .then(user => {
            console.log(user)
            if (!user) {
                req.flash('error', 'No account with that email exists!')
                return res.redirect('/reset')
            }
            user.resetToken = token;
            user.resetTokenExpiration = Date.now() + 3600000
            return user.save()
        })
        .then(result => {
            res.redirect('/')
            transporter.sendMail({
                to: req.body.email,
                from: 'nikita.sawant1003@gmail.com',
                subject: 'You requested a password reset',
                html: `
                    <p>You requested password reset</p>
                    <p> click this <a href = "http://localhost:3000/reset/${token}"> link to set a new password </p>
                
                `
            })
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatuscode = 500
            return next(error)
        })
    })
}
exports.getNewPassword = (req, res, next) => {
    const token = req.params.token;
    User.findOne({resetToken: token, resetTokenExpiration: {$gt :Date.now()}})
    .then(user => {
            let message = req.flash('error')
    if (message.length > 0) {
        message = message[0]
    } else {
        message = null
    }
    res.render('auth/new-password', {
        path: '/new-password',
        pageTitle: 'New Password',
        isAuthenticated: false,
        errorMessage: message,
        passwordToken: token,
        userId: user._id.toString()
      });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatuscode = 500
            return next(error)
        })

}

exports.postNewPassword = (req, res, next) => {
    const newPassword = req.body.password;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    let resetUser;
    // console.log(req.body.passwordToken);

    User.findOne({
        resetToken: passwordToken,
        resetTokenExpiration: {$gt: Date.now()},
        _id: userId
    })
    .then(user => {
        // console.log(user);
        resetUser = user;
        return bcrypt.hash(newPassword, 12)
    })
    .then(hashedPassword => {
        
        resetUser.password = hashedPassword;
        resetUser.resetToken = undefined;
        resetUser.resetTokenExpiration = undefined;
        return resetUser.save();
    })
    .then(result => {
        res.redirect('/login')
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatuscode = 500
        return next(error)
    })
}