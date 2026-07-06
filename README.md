# Aurora Dental Iqaluit — AI Receptionist App

Implementasi penuh desain **`RE/ai-receptionist-dentist-app-iqaluit`** (Claude Design handoff): aplikasi resepsionis AI untuk klinik gigi di **Iqaluit, Nunavut, Canada**, dengan **Sila ᓯᓚ** — AI receptionist trilingual yang "never sleeps, even at −40°".

## Dua sisi aplikasi

| Halaman | Untuk | Isi |
|---|---|---|
| [index.html](index.html) | **Staf klinik** | Login multi-role → console 8 halaman (desain RE) |
| [patient.html](patient.html) | **Pasien / calon pasien** | Situs publik + widget chat Sila 24/7 |

## Fitur (sesuai permintaan + desain)

- **3 bahasa Iqaluit** — English / Français / ᐃᓄᒃᑎᑐᑦ: toggle UI di console, deteksi otomatis di chat Sila (IU: sapaan asli + isi bilingual, menunggu tinjauan penutur asli).
- **Cuaca ekstrem** — data cuaca live Iqaluit (Open-Meteo, fallback offline), banner **BLIZZARD WARNING**, flag pasien berisiko (fly-in Kimmirut, Apex road), skenario badai bisa di-toggle di Setup.
- **Multi-user login** — 6 role (Receptionist, Owner, Admin/Billing, Dentist, Dental assistant, Security); akses halaman & hak tulis rekam medis mengikuti role. Password demo: `aurora` (atau kosong).
- **Dashboard resepsionis** — KPI hari ini, jadwal, "Sila suggests", ringkasan kanal (CALL/WA/SMS/EMAIL/CHAT).
- **Pasien + database** — 30 pasien dummy (6 lengkap sesuai desain), pencarian, registrasi cepat, flag alergi/kondisi.
- **Rekam medis** — tab Clinical record per pasien: catatan berlabel penulis + role + tipe (🎙 Voice / ✦ SILA / ⌨ Typed), **dikte voice-to-text** (Web Speech API, fallback simulasi), **lampiran gambar**, hak tulis sesuai jobdesk.
- **Kalender janji temu** — tampilan Day (3 operatory) / Week / Month, drawer detail (waktu, provider, billing, alert medis, catatan Sila), buat janji manual, kirim reminder / reschedule.
- **Setup klinik** — profil (nama, alamat, telp, email), cabang (Iqaluit + Kimmirut visiting), jam kerja, event & closure (Nunavut Day dll), apotek partner.
- **Karyawan** — 9 staf + role & akses, roster mingguan (shift/half/off), persetujuan cuti dengan cek konflik Sila.
- **Inventory** — 312 item (9 dirinci), reorder point, saran Sila sealift vs air freight (konteks Arktik).
- **Pengingat & pesan** — automations (reminder 48h+2h, recall 6 bulan, weather watch), **bulk send** badai per bahasa/kanal pilihan, **emergency broadcast** satu ketukan, balas manual atau "Let Sila reply".
- **Ringkasan percakapan** — inbox semua kanal dengan ✦ Sila summary + transkrip penuh.
- **Saran AI untuk owner/admin** — insight berbasis data: recall overdue, utilization Jumat, festival Toonik Tyme, telehealth fly-in.
- **Resep & rujukan** — kirim langsung ke Northmart Pharmacy / QGH Pharmacy (text/WA/email) sekali klik.
- **Agent Sila (chat pasien)** — memberi info (jam/harga/asuransi NIHB/lokasi), **mencatat pasien baru**, **membuat/mengubah/membatalkan jadwal** dari slot nyata, triase nyeri tanpa saran medis, **protokol darurat** (paging on-call + peringatan QGH), sadar cuaca (tidak menawarkan slot saat badai), serah-terima ke manusia kapan pun.

Booking/catatan dari chat & console tersimpan di `localStorage` dan langsung muncul di seluruh aplikasi (satu browser = satu database demo). Reset di **Setup → Reset demo data**.

## Omnichannel (telepon · WA · SMS · email · chatbot)

Blueprint riset + integrasi lengkap: **[docs/omnichannel-ai-receptionist.md](docs/omnichannel-ai-receptionist.md)**.
Artefak siap pakai di [`integrations/`](integrations):
- `vapi/system-prompt.md` — persona suara Sila (jeda natural, aturan nomor 7-digit→867, libur Nunavut, protokol darurat)
- `vapi/tools.json` + `vapi/assistant-config.json` — function calling untuk Vapi/Retell
- `server/` — bridge server Node zero-dependency yang memakai ulang engine Sila untuk voice-tools, `/chat`, webhook Twilio (SMS/WA), dan email inbound — semua percakapan tercatat ke inbox console staf

## Arsitektur

Vanilla HTML/CSS/JS, PWA, tanpa build step. Font Public Sans, tema putih elegan utara (`#f8f9fb` / navy `#3b4a6b`).

| File | Peran |
|---|---|
| `js/data.js` | Seed database dummy (klinik, staf, pasien, janji, percakapan, inventory, insight) |
| `js/store.js` | Store + overlay localStorage + engine slot ketersediaan + sesi login |
| `js/sila.js` | Engine AI resepsionis (intent + state machine, EN/FR/IU) |
| `js/weather.js` | Cuaca live Iqaluit (Open-Meteo) + mode badai |
| `js/i18n.js` | String UI 3 bahasa |
| `js/app.js` | SPA console staf (8 halaman) |
| `js/patient.js` | Situs pasien + widget chat |

### Upgrade ke produksi
Engine berbasis aturan adalah fallback demo. Untuk produksi: sambungkan ke backend Claude API + tool use (kontrak tool sama dengan produk `01-dentist`: `lookup_patient`, `create_appointment`, dst.), ganti store dengan Supabase, saluran nyata via Twilio/WA Business, dan mintakan tinjauan penutur asli untuk semua string Inuktitut.

> ⚠️ Semua data pasien fiktif — demo penjualan, bukan alat medis.
