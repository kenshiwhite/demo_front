import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CartContext = createContext({});

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState({});
    // cart structure:
    // {
    //   supplierId: {
    //     supplier: { id, name },
    //     items: [{ product, quantity }]
    //   }
    // }

    useEffect(() => {
        loadCart();
    }, []);

    const loadCart = async () => {
        try {
            const saved = await AsyncStorage.getItem('cart');
            if (saved) setCart(JSON.parse(saved));
        } catch (e) {
            console.log('Could not load cart');
        }
    };

    const saveCart = async (newCart) => {
        try {
            await AsyncStorage.setItem('cart', JSON.stringify(newCart));
            setCart(newCart);
        } catch (e) {
            console.log('Could not save cart');
        }
    };

    const addToCart = (product, quantity = 1) => {
        const supplierId = product.supplier.toString();
        const newCart = { ...cart };

        if (!newCart[supplierId]) {
            newCart[supplierId] = {
                supplier: {
                    id: product.supplier,
                    name: product.supplier_name,
                },
                items: [],
            };
        }

        const existingIndex = newCart[supplierId].items.findIndex(
            i => i.product.id === product.id
        );

        if (existingIndex >= 0) {
            newCart[supplierId].items[existingIndex].quantity += quantity;
        } else {
            newCart[supplierId].items.push({ product, quantity });
        }

        saveCart(newCart);
    };

    const removeFromCart = (supplierId, productId) => {
        const newCart = { ...cart };
        if (!newCart[supplierId]) return;

        newCart[supplierId].items = newCart[supplierId].items.filter(
            i => i.product.id !== productId
        );

        if (newCart[supplierId].items.length === 0) {
            delete newCart[supplierId];
        }

        saveCart(newCart);
    };

    const updateQuantity = (supplierId, productId, quantity) => {
        const newCart = { ...cart };
        if (!newCart[supplierId]) return;

        const index = newCart[supplierId].items.findIndex(
            i => i.product.id === productId
        );

        if (index >= 0) {
            if (quantity <= 0) {
                removeFromCart(supplierId, productId);
            } else {
                newCart[supplierId].items[index].quantity = quantity;
                saveCart(newCart);
            }
        }
    };

    const clearSupplierCart = (supplierId) => {
        const newCart = { ...cart };
        delete newCart[supplierId];
        saveCart(newCart);
    };

    const clearCart = () => saveCart({});

    const getTotalItems = () => {
        return Object.values(cart).reduce(
            (total, supplier) => total + supplier.items.length, 0
        );
    };

    return (
        <CartContext.Provider value={{
            cart,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearSupplierCart,
            clearCart,
            getTotalItems,
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);