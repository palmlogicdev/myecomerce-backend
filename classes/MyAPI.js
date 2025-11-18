const db = require('../config/firebase.js');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const usersCollection = db.collection('users');
const productsCollection = db.collection('products');
const categoryCollection = db.collection('category');

let user = {
    firstname: '',
    lastname: '',
    phoneNumber: '',
    email: '',
    gender: '',
    country: '',
    province: '',
    address: '',
    password: '',
    is_email_verified: false, // defualt false
    create_at: Date.now(),
    reset_token: crypto.randomBytes(32).toString('hex'),
    reset_token_expire: Date.now() + 1000 * 60 * 60 * 48,
    status: 'un_verified',
    role: 'user'
};

let product = {
    product_name: '',
    description: '',
    price: 0,
    stocks: 0,
    image: '',
    category_id: '',
    create_at: Date.now()
};

let category = {
    category_name: '',
    description: ''
}

const error_empty_message = {
    success: false,
    errorMessage: "Required field is missing. Please provide all necessary input."
}

async function check_email_is_exited(email) {
    const docRef = db.collection('users');
    const snapshot = await docRef.where("email", "==", email).get();

    if (snapshot.empty) {
        return false // email ยังไม่ได้ใช้
    } else {
        return true;
    }
}

class MyAPI {
    constructor() {
        this.db = db;
    }

    async createUser({ firstname, lastname, phoneNumber, email, gender, country, province, address, password }) {
        try {
            if (await check_email_is_exited(email)) {
                return {
                    success: false,
                    errorMessage: "Email is already in used"
                };
            }
            const passwordSalt = 10;
            const passwordHash = await bcrypt.hash(password, passwordSalt);

            user.firstname = firstname;
            user.lastname = lastname;   
            user.phoneNumber = phoneNumber;
            user.email = email;
            user.gender = gender;
            user.country = country;
            user.province = province;
            user.address = address;
            user.password = passwordHash;

            await usersCollection.add(user);

            return {
                success: true,
                successMessage: "Inserted success Please login",
                data: user
            };

        } catch (error) {
            console.log('CreateUser: ', error);
            return error;
        }
    }

    async createProduct({product_name, price, stocks, image, description, category_id}) {
        try {
            product.product_name = product_name;
            product.price = price;
            product.stocks = stocks;
            product.image = image;
            product.description = description;
            product.category_id = category_id;

            await productsCollection.add(product);

            return {
                success: true,
                successMessage: "Inserted product successfully",
                product
            }
        } catch (error) {
            console.log('Create product: ', error);
            return error;
        }
    }

    async createCategory({category_name, description}) {
        try {
            category.category_name = category_name;
            category.description = description;

            console.log(category);

            const snapshot = await categoryCollection.add(category);
            if (snapshot.id) {
                return {
                    success: true,
                    data: category,
                    category_id: snapshot.id
                }
            }
        }catch (error) {
            console.log('Create category: ', error);
            return error;
        }
    }
 
    async upload(req) {
        try {
            if (!req.file) {
                return {
                    success: false,
                    errorMessage: "Unable to upload your photo. Please try again"
                }
            } else {
                return {
                    success: true,
                    successMessage: "Your photo has been uploaded successfully",
                    filename: req.file.filename
                }
            }
        } catch (error) {
            console.log('upload image: ', error);
            return error;
        }
    }

    async getUserBy(order, param) {
        try {
            const snapshot = await usersCollection.where(order, '==', param).orderBy(order).get();

            const user = snapshot.docs[0];

            return { id: user.id, ...user.data() };
        } catch (error) {
            console.log('get user by: ', error);
            return [];
        }
    }

    async comparePassword(password, realPassword) {
        const isMatch = await bcrypt.compare(password, realPassword);
        return isMatch;
    }

}

module.exports = MyAPI;