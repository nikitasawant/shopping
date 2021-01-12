const fs = require('fs')
const path = require('path')
const PDFDoc = require('pdfkit')
const stripe = require('stripe')('sk_test_51HKsvUEfaXdKxEpoAsD0OSau6kxk5B5qzJNrBLwPBBxd71YJSJG0SgYHp65fmRuOThfOBp4MPOeLy8u8BROj4l1c00sckgLUb5')

const Product = require('../models/product')
const Order = require('../models/order')

const ITEMS_PER_PAGE = 1

exports.getProducts = (req, res, next) => {
    const page = +req.query.page || 1
        let totalItems
    
        Product.find().countDocuments()
        .then(numProducts => {
            totalItems = numProducts;
            return Product.find()
            .skip((page-1) * ITEMS_PER_PAGE)
            .limit(ITEMS_PER_PAGE)
        })
        .then(products => {
                res.render('shop/product-list', {
                    prods: products, 
                    pageTitle: 'All Products', 
                    path: '/products',
                    currentPage: page,
                    hasNextPage: ITEMS_PER_PAGE * page < totalItems,
                    hasPreviousPage: page > 1,
                    nextPage: page+1,
                    previousPage: page-1,
                    lastPage: Math.ceil(totalItems/ ITEMS_PER_PAGE)
                });
            })
            .catch(err => {
                const error = new Error(err);
                error.httpStatuscode = 500
                return next(error)
            })

    // Product.find()
    //     .then(products => {
    //         res.render('shop/product-list', {
    //             prods: products,    
    //             pageTitle: 'All Products', 
    //             path: '/products',
    //             isAuthenticated: req.session.isLoggedIn
    //         });
    //     })
    //     .catch(err => {
    //         const error = new Error(err);
    //         error.httpStatuscode = 500
    //         return next(error)
    //     })
}

exports.getProduct = (req, res, next) => {
    const prodID = req.params.productId;

    Product.findById(prodID)
    .then(product => {
        res.render('shop/product-detail', {
            product: product,
            pageTitle: product.title,
            path: '/products',
            isAuthenticated: req.session.isLoggedIn
        });
    }
    ).catch(err => {
        const error = new Error(err);
        error.httpStatuscode = 500
        return next(error)
    })
    
}


  exports.getIndex = (req, res, next) => {
        const page = +req.query.page || 1
        let totalItems
    
        Product.find().countDocuments()
        .then(numProducts => {
            totalItems = numProducts;
            return Product.find()
            .skip((page-1) * ITEMS_PER_PAGE)
            .limit(ITEMS_PER_PAGE)
        })
        .then(products => {
                res.render('shop/index', {
                    prods: products, 
                    pageTitle: 'Shop', 
                    path: '/',
                    currentPage: page,
                    hasNextPage: ITEMS_PER_PAGE * page < totalItems,
                    hasPreviousPage: page > 1,
                    nextPage: page+1,
                    previousPage: page-1,
                    lastPage: Math.ceil(totalItems/ ITEMS_PER_PAGE)
                });
            })
            .catch(err => {
                const error = new Error(err);
                error.httpStatuscode = 500
                return next(error)
            })
    }


exports.getCart = (req, res, next) => {

    req.user.populate('cart.items.productId')
    .execPopulate()
    .then(user => {
        const products = user.cart.items
            res.render('shop/cart', {
                pageTitle: 'Your Cart',
                path: '/cart',
                products: products,
                isAuthenticated: req.session.isLoggedIn
         })})
        
   .catch(err => {
    const error = new Error(err);
    error.httpStatuscode = 500
    return next(error)
})
    
}

exports.postCart = (req, res, next) => {
    const prodId = req.body.productId;
    Product.findById(prodId)
        .then(product => {
        req.user.addToCart(product)
    }).then(result => {
        console.log(result);
        res.redirect('/cart');
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatuscode = 500
        return next(error)
    })
   
    // res.redirect('/cart');
}

exports.postCartDeleteProduct = (req, res, next) => {
    const prodId = req.body.productId;
    req.user.removeFromCart(prodId)
    .then(result => {
        res.redirect('/cart');
    })
    .catch(err => {console.log(err)})
}

exports.getOrders = (req, res, next) => {
    Order.find({ 'user.userId': req.user._id })
    
        .then(orders => {
            res.render('shop/orders', {
                pageTitle: 'Your Orders',
                path: '/orders', 
                orders: orders,
                isAuthenticated: req.session.isLoggedIn
        })})
        .catch(err => {
            const error = new Error(err);
            error.httpStatuscode = 500
            return next(error)
        })
    
    
}

exports.postOrder = (req,res,next) => {
    req.user.populate('cart.items.productId')
    .execPopulate()
    .then(user => {
        const products = user.cart.items.map(i => {
            return {quantity: i.quantity, product: { ...i.productId._doc }}
        }) 
        const order = new Order({
            user: {
                email: req.user.email,
                userId: user
            },
            products: products
        })
        return order.save()
    }).then(result => {
        return req.user.clearCart()
        
    }).then(() => {
        res.redirect('/orders')
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatuscode = 500
        return next(error)
    })
}

exports.getCheckoutSuccess = (req,res,next) => {
    req.user.populate('cart.items.productId')
    .execPopulate()
    .then(user => {
        const products = user.cart.items.map(i => {
            return {quantity: i.quantity, product: { ...i.productId._doc }}
        }) 
        const order = new Order({
            user: {
                email: req.user.email,
                userId: user
            },
            products: products
        })
        return order.save()
    }).then(result => {
        return req.user.clearCart()
        
    }).then(() => {
        res.redirect('/orders')
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatuscode = 500
        return next(error)
    })
}


exports.getCheckout = (req, res, next) => {
    let products;
    let total;
    req.user.populate('cart.items.productId')
    .execPopulate()
    .then(user => {
        products = user.cart.items
        total = 0
        products.forEach(p => {
            total += p.quantity * p.productId.price
        })
        // console.log("in checkout")
        return stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: products.map(p => {
                return {
                    name: p.productId.title,
                    description: p.productId.description,
                    amount: p.productId.price * 100,
                    currency: 'usd',
                    quantity: p.quantity
                }
            }),
            success_url: req.protocol + '://' + req.get('host') + '/checkout/success',
            cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel'
        })
    })
        .then(session => {

            res.render('shop/checkout', {
                pageTitle: 'Checkout',
                path: '/checkout',
                products: products,
                totalSum: total,
                sessionId: session.id
         })
        
        })
        
   .catch(err => {
    const error = new Error(err);
    error.httpStatuscode = 500
    return next(error)
})
}

exports.getInvoice = (req,res,next) => {
    // console.log("init")
    const orderId = req.params.orderId;
    Order.findById(orderId)
    .then(order => {
        if(!order){
            return next(new Error('No order found!'))
        }
        if(order.user.userId.toString() !== req.user._id.toString()){
            return next(new Error('Unauthorized'))
        }
        const invoiceName = 'invoice-' + orderId + '.pdf'
        console.log(invoiceName)
        const invoicePath = path.join('data', 'invoices', invoiceName)

        const pdfDoc = new PDFDoc()
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename"' + invoiceName + '"');
        pdfDoc.pipe(fs.createWriteStream(invoicePath));
        pdfDoc.pipe(res)

        pdfDoc.fontSize(26).text("Invoice", {
            underline: true
        })
        pdfDoc.text("-----------------------------------------")
        let totalPrice = 0
        order.products.forEach(prod => {
            totalPrice += prod.quantity*prod.product.price

            pdfDoc.text(prod.product.title + ' - ' + prod.quantity +' x $' + prod.product.price)
        })
        pdfDoc.text('Total Price:' + totalPrice)
        pdfDoc.end()

        //Preloading the entire data

        // fs.readFile(invoicePath, (err, data) => {
        //     if(err){
        //         return next(err)
        //     }
        //     res.setHeader('Content-Type', 'application/pdf');
        //     res.setHeader('Content-Disposition', 'inline; filename"' + invoiceName + '"');
        //     res.send(data)
        // })

        //Streaming files

        // const file = fs.createReadStream(invoicePath);
        //         file.pipe(res)

    })
    .catch(err => next(err))
    
}
