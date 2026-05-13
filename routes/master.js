const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET Divisi
router.get('/divisi', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM divisi');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Gagal mengambil data divisi' });
    }
});

// POST Divisi
router.post('/divisi', async (req, res) => {
    try {
        const { nama_divisi } = req.body;
        if (!nama_divisi) return res.status(400).json({ message: 'Nama tidak boleh kosong' });
        await pool.execute('INSERT INTO divisi (nama_divisi) VALUES (?)', [nama_divisi]);
        res.json({ message: 'Divisi berhasil ditambahkan' });
    } catch (error) {
        res.status(500).json({ message: 'Gagal menambah divisi' });
    }
});

// GET Jabatan
router.get('/jabatan', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM jabatan');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Gagal mengambil data jabatan' });
    }
});

// POST Jabatan
router.post('/jabatan', async (req, res) => {
    try {
        const { nama_jabatan } = req.body;
        if (!nama_jabatan) return res.status(400).json({ message: 'Nama tidak boleh kosong' });
        await pool.execute('INSERT INTO jabatan (nama_jabatan) VALUES (?)', [nama_jabatan]);
        res.json({ message: 'Jabatan berhasil ditambahkan' });
    } catch (error) {
        res.status(500).json({ message: 'Gagal menambah jabatan' });
    }
});

module.exports = router;