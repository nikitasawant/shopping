const Product = require('../models/product')
//const Cart = require('../models/cart')
const { validationResult } = require('express-validator/check')
const mongoose = require('mongoose')

const fileHelper = require('../utils/file')

exports.getAddProduct = (req, res, next) => {
    
    res.render('admin/edit-product', {
        pageTitle: 'Add Product', 
        path: '/admin/add-product',
        editing: false,
        hasError: false,
        errorMessage: null,
        isAuthenticated: req.session.isLoggedIn
});
}

exports.postAddProduct = (req,res, next) => {
    // console.log("in post add product")
    const title = req.body.title;
    const price = req.body.price;
    const image = req.file;
    console.log(image)
    const description = req.body.description;

    if(!image){
        // console.log("in post add product 2")
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Add Product', 
            path: '/admin/add-product',
            editing: false,
            hasError: true,
            product: {
                title: title,
                price: price,
                description: description
            },
            errorMessage: 'Attached file is not an image.',
            validationErrors: []
    })
    }

    const errors = validationResult(req)

    if(!errors.isEmpty()){
        // console.log("in post add product 3")
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Add Product', 
            path: '/admin/add-product',
            editing: false,
            hasError: true,
            product: {
                title: title,
                // imageUrl: imageUrl,
                price: price,
                description: description
            },
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array(),
            // isAuthenticated: req.session.isLoggedIn
    })
    }

    const imageUrl = image.path

    const product = new Product({
        // _id: new mongoose.Types.ObjectId('5f36b6aa4f89db08e04436b5'),
        title: title, 
        price: price, 
        description: description, 
        imageUrl: imageUrl, 
        userId: req.user
    })

    product.save()
    .then(result => {
        // console.log(result);
        res.redirect('/admin/products');
    })
    .catch(err => {
        console.log(err);
        // const error = new Error(err);
        // error.httpStatuscode = 500
        // return next(error)
    })

}

exports.getEditProduct = (req, res, next) => {
    const editMode = req.query.edit;
    if (!editMode) {
        res.redirect('/')
        
    }
    const prodID = req.params.productId;
    // req.user.getProducts({ where: {id:prodID}})
    Product.findById(prodID)
    .then(product => {
        //const product = products[0];
        if (!product) {
            // console.log("redirected to home page")
            return res.redirect('/')

        }
        res.render('admin/edit-product', {
            pageTitle: 'Edit Product', 
            path: '/admin/edit-product',
            editing: editMode,
            hasError: false,
            errorMessage: null,
            product: product,
            isAuthenticated: req.session.isLoggedIn
    })}
    ).catch(err => {
        const error = new Error(err);
        error.httpStatuscode = 500
        return next(error)
    })
}

exports.postEditProducts = (req, res, next) => {
    const prodId = req.body.productId;
    const updatedTitle = req.body.title;
    const updatedPrice = req.body.price;
    const updatedDesc = req.body.description;
    const image = req.file;

    console.log(prodId)

    const errors = validationResult(req)

    if(!errors.isEmpty()){
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Edit Product', 
            path: '/admin/edit-product',
            editing: true,
            hasError: true,
            product: {
                title: updatedTitle,
                // imageUrl: image.path,
                price: updatedPrice,
                description: updatedDesc,
                _id: prodId
            },
            errorMessage: errors.array()[0].msg,
            isAuthenticated: req.session.isLoggedIn
    })
    }

    Product.findById(prodId)
        .then(product => {
            if(!product){
                const product = new Product({
                    title: updatedTitle,
                    imageUrl: image.path,
                    price: updatedPrice,
                    description: updatedDesc, 
                    userId: req.user
                })
                return product.save()
                .then(result => {
                    // console.log(result);
                    res.redirect('/admin/products');
                })
                .catch(err => {
                    console.log(err);
                })
            }

            if(product.userId.toString() !== req.user._id.toString()){
                 return res.redirect('/')
            }
            product.title = updatedTitle;
            product.price = updatedPrice;
            if (image) {
                fileHelper.deleteFile(product.imageUrl)

                product.imageUrl = image.path
            }
            // product.imageUrl = updatedImageUrl;
            product.description = updatedDesc;

            return product.save().then(result => {
                console.log("Updated Product");
                res.redirect('/admin/products');
            });
        })
        
        .catch(err => {
            const error = new Error(err);
            error.httpStatuscode = 500
            return next(error)
        })
    
}

exports.getProducts = (req, res, next) => {
    Product.find({userId: req.user._id})  //req.user._id exists bcoz we created a middleware in app.js
        .then(products => {
            res.render('admin/products', {
                prods: products,    
                pageTitle: 'Admin Products', 
                path: '/admin/products',
                isAuthenticated: req.session.isLoggedIn
            }); 
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatuscode = 500
            return next(error)
        })

}

// exports.postDeleteProducts = (req, res, next) => {
//     const prodId = req.body.productId;
//     console.log(prodId)

//     Product.findById(prodId)
//     .then(product => {
//         if (!product){
//             return next(new Error("Product not found"))
//         }
//         fileHelper.deleteFile(product.imageUrl)
//         return Product.deleteOne({ _id: prodId, userId: req.user._id})
//     })
//     .then(result => {
//         console.log("Destroyed product");
//         res.redirect('/admin/products');
//     })
//     .catch(err => {
//         const error = new Error(err);
//         error.httpStatuscode = 500
//         return next(error)
//     })
    
// }

exports.deleteProduct = (req, res, next) => {
    const prodId = req.params.productId;
    console.log(prodId)

    Product.findById(prodId)
    .then(product => {
        if (!product){
            return next(new Error("Product not found"))
        }
        fileHelper.deleteFile(product.imageUrl)
        return Product.deleteOne({ _id: prodId, userId: req.user._id})
    })
    .then(result => {
        console.log("Destroyed product");
        res.status(200).json({message: 'Success'})
        // res.redirect('/admin/products');
    })
    .catch(err => {
        res.status(500).json({message: 'Deleting failed'})
        // const error = new Error(err);
        // error.httpStatuscode = 500
        // return next(error)
    })
    
}