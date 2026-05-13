const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// --- PERIODE ---
router.get('/periode', async (req, res) => {
    const [rows] = await pool.execute('SELECT * FROM periode ORDER BY id DESC');
    res.json(rows);
});

router.post('/periode', async (req, res) => {
    const { nama_periode } = req.body;
    await pool.execute('INSERT INTO periode (nama_periode) VALUES (?)', [nama_periode]);
    res.json({ message: 'Periode ditambahkan' });
});

// --- MAPPING ---
router.post('/mapping', async (req, res) => {
    try {
        const { id_karyawan_dinilai, id_penilai, tipe_penilai, id_periode } = req.body;
        
        const [exist] = await pool.execute(
    'SELECT id FROM mapping_penilai WHERE id_karyawan_dinilai=? AND id_penilai=? AND tipe_penilai=? AND id_periode=?',
    [id_karyawan_dinilai, id_penilai, tipe_penilai, id_periode] // Tambah tipe_penilai di sini
);
        if(exist.length > 0) return res.status(400).json({ message: 'Mapping sudah ada' });

        await pool.execute(
            `INSERT INTO mapping_penilai 
            (id_karyawan_dinilai, id_penilai, tipe_penilai, id_periode, status) 
            VALUES (?,?,?,?,?)`,
            [id_karyawan_dinilai, id_penilai, tipe_penilai, id_periode, 'Belum']
        );
        res.json({ message: 'Mapping berhasil' });
    } catch (error) {
        res.status(500).json({ message: 'Error mapping' });
    }
});

router.get('/mapping/:periodeId', async (req, res) => {
    const { periodeId } = req.params;
    const [rows] = await pool.execute(`
        SELECT m.*, k1.nama_lengkap as nama_dinilai, k2.nama_lengkap as nama_penilai
        FROM mapping_penilai m
        JOIN karyawan k1 ON m.id_karyawan_dinilai = k1.id
        JOIN karyawan k2 ON m.id_penilai = k2.id
        WHERE m.id_periode = ?
    `, [periodeId]);
    res.json(rows);
});

// --- INPUT NILAI DETAIL (AKHLAK) ---
router.put('/submit-nilai/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nilai_amanah, nilai_kompeten, nilai_harmonis, nilai_loyal, nilai_adaptif, nilai_kolaboratif } = req.body;
        
        await pool.execute(`
            UPDATE mapping_penilai SET 
            nilai_amanah=?, nilai_kompeten=?, nilai_harmonis=?, nilai_loyal=?, nilai_adaptif=?, nilai_kolaboratif=?,
            status = 'Selesai'
            WHERE id = ?
        `, [nilai_amanah, nilai_kompeten, nilai_harmonis, nilai_loyal, nilai_adaptif, nilai_kolaboratif, id]);
        
        res.json({ message: 'Nilai berhasil disimpan' });
    } catch (error) {
        res.status(500).json({ message: 'Gagal simpan nilai' });
    }
});

// --- INPUT KPI (Baru) ---
router.put('/update-kpi/:id_karyawan/:id_periode', async (req, res) => {
    try {
        const { id_karyawan, id_periode } = req.params;
        const { nilai_kpi } = req.body;

        // Cek apakah sudah ada data hasil, jika belum buat baru
        const [exist] = await pool.execute(
            'SELECT id FROM hasil_penilaian WHERE id_karyawan=? AND id_periode=?', 
            [id_karyawan, id_periode]
        );

        if(exist.length > 0) {
            await pool.execute('UPDATE hasil_penilaian SET nilai_kpi=? WHERE id_karyawan=? AND id_periode=?', [nilai_kpi, id_karyawan, id_periode]);
        } else {
            await pool.execute('INSERT INTO hasil_penilaian (id_karyawan, id_periode, nilai_kpi) VALUES (?,?,?)', [id_karyawan, id_periode, nilai_kpi]);
        }
        
        res.json({ message: 'Nilai KPI berhasil diupdate' });
    } catch (error) {
        res.status(500).json({ message: 'Gagal update KPI' });
    }
});

// --- KALKULASI OTOMATIS (LENGKAP) ---
router.get('/calculate/:periodeId', async (req, res) => {
    const { periodeId } = req.params;
    const connection = await pool.getConnection();
    
    try {
        // 1. Ambil semua karyawan yang sudah selesai dinilai
        const [karyawans] = await connection.execute(`
            SELECT DISTINCT id_karyawan_dinilai as id_karyawan 
            FROM mapping_penilai 
            WHERE id_periode = ? AND status = 'Selesai'
        `, [periodeId]);

        for (const k of karyawans) {
            // 2. Hitung Rata-rata per Nilai AKHLAK per Tipe Penilai
            const getAvg = async (tipe) => {
                const [rows] = await connection.execute(`
                    SELECT 
                        AVG(nilai_amanah) as a, AVG(nilai_kompeten) as k, 
                        AVG(nilai_harmonis) as h, AVG(nilai_loyal) as l, 
                        AVG(nilai_adaptif) as ad, AVG(nilai_kolaboratif) as ko
                    FROM mapping_penilai 
                    WHERE id_karyawan_dinilai = ? AND id_periode = ? AND tipe_penilai = ?
                `, [k.id_karyawan, periodeId, tipe]);
                return rows[0];
            };

            const nAtasan = await getAvg('Atasan');
            const nRekan = await getAvg('Rekan');
            const nBawahan = await getAvg('Bawahan');
            const nSelf = await getAvg('Self');

            // Fungsi helper hitung nilai tertimbang per nilai AKHLAK
            const calcWeighted = (field) => {
                let total = 0;
                // Bobot: Atasan 40%, Rekan 20%, Bawahan 30%, Self 10%
                // Nilai skala 1-5 dikali 20 agar jadi 1-100
                const toScore = (val) => (val || 0) * 20; 
                
                total += (toScore(nAtasan[field]) * 0.4);
                total += (toScore(nRekan[field]) * 0.2);
                total += (toScore(nBawahan[field]) * 0.3);
                total += (toScore(nSelf[field]) * 0.1);
                return total;
            };

            // 3. Hitung Total Nilai AKHLAK (Rata-rata dari 6 nilai)
            const nilaiAmanah = calcWeighted('a');
            const nilaiKompeten = calcWeighted('k');
            const nilaiHarmonis = calcWeighted('h');
            const nilaiLoyal = calcWeighted('l');
            const nilaiAdaptif = calcWeighted('ad');
            const nilaiKolaboratif = calcWeighted('ko');

            const nilaiTotalAkhlak = (nilaiAmanah + nilaiKompeten + nilaiHarmonis + nilaiLoyal + nilaiAdaptif + nilaiKolaboratif) / 6;

            // 4. Ambil Nilai KPI (default 0 jika belum input)
            // 4. Ambil Nilai KPI
const [kpiData] = await connection.execute('SELECT nilai_kpi FROM hasil_penilaian WHERE id_karyawan=? AND id_periode=?', [k.id_karyawan, periodeId]);

// Logika: Jika belum ada data ATAU nilainya 0, pakai default 80 (untuk demo)
// Jika sudah diisi manual, pakai nilai manual tersebut.
let nilaiKPI = 80; // Default sementara untuk testing
if (kpiData.length > 0 && kpiData[0].nilai_kpi > 0) {
    nilaiKPI = kpiData[0].nilai_kpi;
}

            // 5. Hitung Nilai Akhir (Akhlak 20%, KPI 80%)
            const nilaiAkhir = (nilaiTotalAkhlak * 0.2) + (nilaiKPI * 0.8);
            
            // Kategori
            let kategori = 'P3';
            if(nilaiAkhir < 60) kategori = 'P1';
            else if(nilaiAkhir < 70) kategori = 'P2';
            else if(nilaiAkhir < 90) kategori = 'P3';
            else kategori = 'P4';

            // 6. Simpan/Hapus Hasil
            await connection.execute('DELETE FROM hasil_penilaian WHERE id_karyawan=? AND id_periode=?', [k.id_karyawan, periodeId]);
            await connection.execute(`
                INSERT INTO hasil_penilaian 
                (id_karyawan, id_periode, nilai_akhir, kategori, nilai_kpi, nilai_amanah, nilai_kompeten, nilai_harmonis, nilai_loyal, nilai_adaptif, nilai_kolaboratif)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)
            `, [k.id_karyawan, periodeId, nilaiAkhir, kategori, nilaiKPI, nilaiAmanah, nilaiKompeten, nilaiHarmonis, nilaiLoyal, nilaiAdaptif, nilaiKolaboratif]);
        }
        
        res.json({ message: 'Kalkulasi selesai dengan rumus lengkap!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error calculate' });
    } finally {
        connection.release();
    }
});

// --- GET HASIL (Untuk Chart) ---
router.get('/hasil/:periodeId', async (req, res) => {
    const { periodeId } = req.params;
    const [rows] = await pool.execute(`
        SELECT h.*, k.nama_lengkap, k.nip
        FROM hasil_penilaian h
        JOIN karyawan k ON h.id_karyawan = k.id
        WHERE h.id_periode = ?
    `, [periodeId]);
    res.json(rows);
});

module.exports = router;