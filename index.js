require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiKeyVerify = require('./middlewares/apiKeyVerify.js');
const verifyToken = require('./middlewares/verifyToken.js');
const MyAPIClass = require('./classes/MyAPI.js');
const multer = require('multer');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { secret, expiresIn } = require('./config/jwt.js');
const cookieParser = require('cookie-parser');

const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
    console.log('Create', uploadDir);
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, res, cb) => {
        cb(null, './uploads');
    },
    filename: (req, file, cb) => {
        const ext = file.originalname.split('.').pop();
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '.' + ext);
    }
});

const upload = multer({ storage })

const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:5173', // หรือ '*' เพื่ออนุญาตทุกที่
    methods: ['GET','POST','PUT','DELETE'],
    credentials: true
}));
app.use('/api/uploads', express.static('uploads'));
app.use(cookieParser());

const MyAPI = new MyAPIClass;

const serverErrorMessage = {
    success: false,
    errorMessage: "Server failed, Please try again later"
}

function generateToken(user) {
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role
    };

    return jwt.sign(payload, secret, {expiresIn});
}

//* create user
//? status : good
app.post('/api/creatUser', apiKeyVerify, async (req, res) => {
    try {
        const { firstname, lastname, phoneNumber, email, gender, country, province, address, password } = req.body;
        const apiRes = await MyAPI.createUser({ firstname, lastname, phoneNumber, email, gender, country, province, address, password });

        if (apiRes.success) {
            res.status(200).json(apiRes);
        } else {
            res.status(400).json(apiRes);
        }
    } catch (error) {
        console.log('/api/createUser => ', error);
        res.status(500).json(serverErrorMessage);
    }
});

//* create product
//? status : good
app.post('/api/createProduct', apiKeyVerify, async (req, res) => {
    try {
        const { product_name, price, stocks, image, desciption, category_id } = req.body;
        const apiRes = await MyAPI.createProduct({ product_name, price, stocks, image, desciption, category_id });
        
        if (apiRes.success) {
            res.status(200).json(apiRes);
        } else {
            res.status(400).json(apiRes);
        }
    } catch (error) {
        console.log('/api/createProduct => ', error);
        res.status(500).json(serverErrorMessage);
    }
});

//* create category
//! status : in maintainace do not use
app.post('/api/createCategory', apiKeyVerify, async (req, res) => {
    try {
        const { category_name, description } = req.body;
        const apiRes = await MyAPI.createCategory({ category_name, description });

        if (apiRes.success) {
            res.status(200).json(apiRes);
        } else {
            res.status(400).json(apiRes);
        }
    } catch (error) {
        console.log('/api/createCategory => ', error);
        res.status(500).json(serverErrorMessage);
    }
})

//* upload image
//! status : no test yet do not use
app.post('/api/uploadImage', upload.single('image'), async (req, res) => {
    try {
        const apiRes = await MyAPI.upload(req);

        if (apiRes.success) {
            res.status(200).json(apiRes);
        } else {
            res.status(400).json(apiRes);
        }
    } catch (error) {
        console.log('/api/uploadImage => ', error);
        res.status(500).json(serverErrorMessage);
    }
});

//* login
//? status : good
app.post('/api/login', apiKeyVerify, async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await MyAPI.getUserBy('email', email);

        console.log(user);

        if (user.length === 0) {
            return res.status(404).json({
                success: false,
                errorMessage: "Can not find your email, Please check"
            });
        }

        const isValid = await MyAPI.comparePassword(password, user.password);
        if (!isValid) {
            return res.status(400).json({
                success: false,
                errorMessage: "Invalid password"
            })
        }

        const token = generateToken(user);

        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            maxAge: 1000 * 60 * 60 * 24
        });

        res.status(200).json({
            success: true,
            successMessage: "Logged in successfully"
        });

    } catch (error) {
        console.log('/api/login => ', error);
        res.status(500).json(serverErrorMessage);
    }
});

//* logout
//? status : good
app.post('/api/logout', verifyToken, async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader.split(' ')[1];

    res.cookie('token', '', {
        httpOnly: true,
        secure: false,
        maxAge: 0
    });

    const apiRes = await MyAPI.logout(token);

    if (apiRes.success) {
        return res.status(200).json(apiRes);
    } else {
        return res.status(400).json(apiRes);
    }
});

/*
 * write a app.post createCarts
 * create collection orders, order_items, payments, shipping
 TODO: write a app.post orders, order_items, payments, shipping
*/

//* create cart
//? status : good
app.post('/api/createCarts', verifyToken, async (req, res) => {
    const user_id = req.user.id;
    const items = req.body;
    console.log(items);

    const apiRes = await MyAPI.createCart({user_id, items});
    
    if (apiRes.success) {
        return res.status(200).json(apiRes);
    } else {
        return res.status(400).json(apiRes);
    }
});

app.get('/api/check-token', async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(404).json({
            success: false,
            errorMessage: "Token not found, Please login"
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_KEY);
        return res.json({ authenticated: true, user: decoded });
    } catch (error) {
        return res.json({ authenticated: false });
    }
})
// app.post('/api/createOrders')

app.listen(PORT, () => {
    console.log(`App is running on http://localhost:${PORT}`);
});