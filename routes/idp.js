const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/', async (req, res) => {
    const [rows] = await pool.execute(`
        SELECT i.id, i.program_pengembangan, i.progress, i.status, k.nama_lengkap
        FROM idp i
        JOIN karyawan k ON i.id_karyawan = k.id
    `);
    res.json(rows);
});

router.post('/', async (req, res) => {
    const { id_karyawan, program_pengembangan } = req.body;
    await pool.execute(
        'INSERT INTO idp (id_karyawan, program_pengembangan, status) VALUES (?, ?, "Belum Dimulai")',
        [id_karyawan, program_pengembangan]
    );
    res.json({ message: 'IDP ditambahkan' });
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { progress, status } = req.body;
    await pool.execute('UPDATE idp SET progress=?, status=? WHERE id=?', [progress, status, id]);
    res.json({ message: 'IDP diupdate' });
});

module.exports = router;