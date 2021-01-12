exports.get404 = (req, res, next) => {
    res.status(404).render('404', {pageTitle: 'Page Not Found', path: '/400',
    isAuthenticated: req.isLoggedIn});


    
    //res.status(404).sendFile(path.join(__dirname, 'views', '404.html'))
}

exports.get500 = (req, res, next) => {
    res.status(500).render('500', {pageTitle: 'Error', path: '/500',
    isAuthenticated: req.isLoggedIn});
}