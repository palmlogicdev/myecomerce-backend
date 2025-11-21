const db = require('../config/firebase.js');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { addAbortListener } = require('events');

const usersCollection = db.collection('users');
const productsCollection = db.collection('products');
const categoryCollection = db.collection('category');
const cartCollection = db.collection('carts');
const blacklist_tokenCollection = db.collection('blacklist_token');

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
};

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
            return {
                success: false,
                errorMessage: "Can not create user please try again"
            };
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
            return {
                success: false,
                errorMessage: "Can not create product, Please check server"
            };
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
            return {
                success: false,
                errorMessage: "Can not create category, Please check server"
            };
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
            return {
                success: false,
                errorMessage: "Can not upload photo, Please try again"
            }
        }
    }

    async getUserBy(order, param) {
        try {
            const snapshot = await usersCollection.where(order, '==', param).orderBy(order).get();

            const user = snapshot.docs[0];

            return { id: user.id, ...user.data() };
        } catch (error) {
            console.log('get user by: ', error);
            return {
                success: false,
                errorMessage: "Can not get user, Please try again"
            }
        }
    }

    async comparePassword(password, realPassword) {
        const isMatch = await bcrypt.compare(password, realPassword);
        return isMatch;
    }

    async getCartBy(order, param) {
        try {
            const snapshot = await cartCollection.where(order, '==', param).orderBy(order).get();
            
            if (snapshot.empty) {
                return [];
            }
            const cart = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            return cart;
        } catch (error) {
            console.log('get cart by : ', error);
            return [];
        }
    }

    async createCart({ user_id, items}) {
        try {
            let cart = {
                item: [
                ],
                user_id: ''
            };

            const data = await this.getCartBy('user_id', user_id);

            if (data.length === 0 ) {
                cart.user_id = user_id;
                cart.item = items.map(item => {
                    return {
                        product_id: item.product_id,
                        quantity: item.quantity
                    };
                });

                const snapshot = await cartCollection.add(cart);
                console.log("Created cart : ", cart);

                return {
                    success: true,
                    successMessage: 'Create cart successfully',
                    id: snapshot.id
                };
            } else {
                const dbCart = data[0];
                const user_id = dbCart.user_id;
                const item = dbCart.item || [];

                cart.user_id = user_id;
                cart.item = item;
                console.log('items from dbCart.item: ', item);

                console.log('cart item : ', cart);

                items.forEach(newItem => {
                    const index = cart.item.findIndex(i => i.product_id === newItem.product_id);
                    console.log(index);

                    if (index !== -1) {
                        cart.item[index].quantity += newItem.quantity;
                    } else {
                        cart.item.push({
                            product_id: newItem.product_id,
                            quantity: newItem.quantity
                        });
                    }
                });
                
                console.log('Cart updated : ', cart);
                const docRef = cartCollection.doc(dbCart.id);
                docRef.update({
                    item : cart.item
                });

                cart.item = [];
                cart.user_id = '';

                return {
                    success: true,
                    successMessage: "Update cart successfully"
                }
            }
        } catch (error) {
            console.log("create cart : ", error);
            return {
                success: false,
                errorMessage: 'Can not update cart'
            }
        }
    }

    async logout(token) {
        try {

            const tokenHash = crypto.createHash('sha256').update(token, 'utf8').digest('hex');

            const newRovoke = {
                revoked_at: Date.now()
            };

            await blacklist_tokenCollection.doc(tokenHash).set(newRovoke);
            return {
                success: true,
                successMessage: "Logged out successfully"
            }
        } catch (error) {
            console.log('Logout : ', error);
            return {
                success: false,
                errorMessage: "Can not logout, Please check server"
            };
        }
    }

    async getAllProduct() {
        try {
            const snapshot = await productsCollection.get();

            const products = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            return {
                success: true,
                data: products
            }
        } catch (error) {
            console.log('Get all product :', error);
            return {
                success: false,
                errorMessage: error.message
            }
        }
    }

    async getProductBy(items) {
        try {
            console.log('items: ', items);
            const productIdArray = items.map(i => i.product_id);
            console.log('product_id: ', productIdArray);

            const docRef = productIdArray.map(id => productsCollection.doc(id));
            const snapshot = await productsCollection.firestore.getAll(...docRef);

            if (snapshot.empty) return [];
            console.log(snapshot.docs);

            const products = snapshot.map(doc => {
                const cartItems = items.find(item => item.product_id === doc.id);
                return {
                    id: doc.id,
                    ...doc.data(),
                    quantity: cartItems ? cartItems.quantity : 0
                };
            }).filter(p => p !== null);

            console.log('products :', products);
            return products;
        } catch (error) {
            console.log('getProductBy error:', error);
            return [];
        }
    }

    async deleteCart(product_id, user_id) {
        try {
            const snapshot = await cartCollection.where('user_id', '==', user_id).get();

            if (snapshot.empty) return { success: false, errorMessage: 'Cart not found' };

            const cartDoc = snapshot.docs[0];
            const cartData = cartDoc.data();

            const updateItems = cartData.item.filter(i => i.product_id !== product_id);

            await cartCollection.doc(cartDoc.id).update({ item: updateItems });

            return {
                success: true,
                successMessage: "Delete cart"
            }
        } catch (error) {
            console.log('deleteCart error: ', error);
            return [];
        }
    }
}

module.exports = MyAPI;