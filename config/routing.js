var express = require('express');
var router = express.Router();

function authenticate(name, pass, fn) {
    var user = users[name];
    // query the db for the given username
    if (!user) return fn(new Error('cannot find user'));
    // apply the same algorithm to the POSTed password, applying
    // the hash against the pass / salt, if there is a match we
    // found the user
    hash(pass, user.salt, function (err, hash) {
        if (err) return fn(err);
        if (hash == user.hash) return fn(null, user);
        fn(new Error('invalid password'));
    });
}

function restrict(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        req.session.error = 'Access denied!';
        res.redirect('/login');
    }
}

router.get('/', function (req, res) {
    res.render('index.html', {
        url: req.url
    });
});

router.get('/cards', restrict, function (req, res) {
    res.render('cards.html', {
        url: req.url,
        user: req.session.user
    });
});

router.get('/login', function (req, res) {
    res.render('login.html', {
        url: req.url
    });
});

router.post('/login', function (req, res) {
    authenticate(req.body.email, req.body.password, function (err, user) {
        if (user) {
            // Regenerate session when signing in
            // to prevent fixation
            req.session.regenerate(function () {
                // Store the user's primary key
                // in the session store to be retrieved,
                // or in this case the entire user object
                req.session.user = user;
                req.session.success = 'Login successful!';
                res.redirect('/cards');
            });
        } else {
            req.session.error = 'Authentication failed, please check your username and password.';
            res.redirect('/login');
        }
    });
});

router.get('/logout', function (req, res) {
    req.session.destroy(function () {
        res.redirect('/');
    });
});

router.get('/registration', function (req, res) {
    res.render('registration.html', {
        url: req.url
    });
});

router.post('/registration', function (req, res) {
    //
});

module.exports = router;
