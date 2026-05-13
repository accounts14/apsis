const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET All
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT k.id, k.nip, k.nama_lengkap, k.email, k.status, 
                   k.id_divisi, k.id_jabatan, d.nama_divisi, j.nama_jabatan
            FROM karyawan k
            LEFT JOIN divisi d ON k.id_divisi = d.id
            LEFT JOIN jabatan j ON k.id_jabatan = j.id
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Gagal mengambil data karyawan' });
    }
});

// POST (Tambah)
router.post('/', async (req, res) => {
    try {
        const { nip, nama_lengkap, id_divisi, id_jabatan, email, status } = req.body;
        await pool.execute(
            'INSERT INTO karyawan (nip, nama_lengkap, id_divisi, id_jabatan, email, status) VALUES (?, ?, ?, ?, ?, ?)',
            [nip, nama_lengkap, id_divisi || null, id_jabatan || null, email, status]
        );
        res.json({ message: 'Karyawan berhasil ditambahkan' });
    } catch (error) {
        res.status(500).json({ message: 'Gagal menambah karyawan', error: error.message });
    }
});

// PUT (Update)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nip, nama_lengkap, id_divisi, id_jabatan, email, status } = req.body;
        await pool.execute(
            'UPDATE karyawan SET nip=?, nama_lengkap=?, id_divisi=?, id_jabatan=?, email=?, status=? WHERE id=?',
            [nip, nama_lengkap, id_divisi || null, id_jabatan || null, email, status, id]
        );
        res.json({ message: 'Karyawan berhasil diupdate' });
    } catch (error) {
        res.status(500).json({ message: 'Gagal update karyawan' });
    }
});

// DELETE
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.execute('DELETE FROM karyawan WHERE id = ?', [id]);
        res.json({ message: 'Karyawan berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ message: 'Gagal menghapus karyawan' });
    }
});

module.exports = router;