const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

// REGISTER
router.post('/register', async (req, res) => {
    try {
        const { username, password, nama_lengkap } = req.body;
        
        // Cek username sudah ada atau belum
        const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length > 0) {
            return res.status(400).json({ message: 'Username sudah digunakan' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Simpan ke DB
        await pool.execute(
            'INSERT INTO users (username, password, nama_lengkap) VALUES (?, ?, ?)',
            [username, hashedPassword, nama_lengkap]
        );

        res.status(201).json({ message: 'Register berhasil! Silakan login.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) {
            return res.status(400).json({ message: 'Username atau password salah' });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: 'Username atau password salah' });
        }

        // Kirim data user (tanpa token JWT dulu untuk simplicitas)
        res.json({ 
            message: 'Login berhasil', 
            user: { id: user.id, username: user.username, nama: user.nama_lengkap } 
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;