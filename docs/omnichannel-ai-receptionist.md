# Blueprint: Sila ᓯᓚ Omnichannel — AI Resepsionis via Telepon, WA, SMS, Email & Chatbot

> Hasil riset + rencana integrasi untuk mengubah Sila dari chatbot demo menjadi resepsionis
> omnichannel produksi untuk Aurora Dental Iqaluit. Artefak siap pakai ada di [`integrations/`](../integrations).

---

## 1. Riset pasar: AI resepsionis untuk dentist (2026)

**Masalah yang dipecahkan** (angka industri, bagus untuk materi jualan):
- Praktik gigi rata-rata **kehilangan 20–38% panggilan masuk**; tiap panggilan terlewat bernilai hingga **~$850** — total $100–150k/tahun per praktik ([Arini](https://www.arini.ai/blog/improve-missed-call-percentage-dental-offices), [Peerlogic](https://www.peerlogic.com/)).

**Fitur standar pemain khusus dental** (Arini, Peerlogic "Aimee", Annie — acuan paritas fitur):
1. Jawab telepon 24/7, respons ±300–600 ms, suara natural dengan jeda/filler.
2. Booking / reschedule / cancel langsung ke sistem jadwal (integrasi PMS: Dentrix, OpenDental, Eaglesoft).
3. **Missed-call text-back** — panggilan tak terjawab langsung dibalas SMS.
4. Registrasi pasien baru + kirim intake form.
5. Reminder otomatis + recall/reaktivasi outbound (kampanye).
6. Triase darurat → eskalasi ke dokter jaga.
7. Ringkasan & rekaman tiap percakapan ke dashboard staf.
8. Atribusi marketing (kanal mana yang mengisi kursi).

**Semua fitur di atas sudah ada padanannya di app kita** (dashboard, inbox + Sila summary, automations, bulk send, emergency broadcast) — yang belum nyata adalah *kanal*-nya. Itu fokus blueprint ini.

## 2. Arsitektur

```
 Telepon ──► Twilio Number ──► Vapi / Retell (STT+LLM+TTS)──┐
 SMS ───────► Twilio ────────────────────────────────────┐  │  function calls /
 WhatsApp ──► Twilio WA Business ────────────────────────┤  │  webhook events
 Email ─────► Postmark inbound ──────────────────────────┤  ▼
 Website ───► widget chat (patient.html) ────────────────┴─► BRIDGE SERVER (integrations/server)
                                                              │  = engine Sila yang SAMA dgn app
                                                              ▼
                                                    Database (demo: db.json →
                                                    produksi: Supabase Postgres)
                                                              ▼
                                              Staff console (index.html): inbox,
                                              kalender, pasien — update real-time
```

**Prinsip kunci: satu SOP, lima kanal.** Bridge server memuat ulang `js/data.js`, `js/store.js`, `js/sila.js` — jadi aturan booking, jam buka, **libur Nunavut**, aturan **nomor 7-digit → 867**, dan protokol darurat identik di semua kanal, dan setiap percakapan otomatis muncul di inbox console staf.

## 3. Pilihan platform voice (riset 2026)

| Kriteria | **Vapi** | **Retell** |
|---|---|---|
| Latensi jawab | ~600–800 ms (sub-500 ms bisa dituning) | ~600 ms, 95% sukses reschedule di uji pihak ketiga |
| Tool calling | Terkaya (multi-tool, workflow builder) | Ada, sedikit kurang ergonomis |
| Harga /menit (semua biaya) | ±$0.11–0.33 tergantung provider | ±$0.07–0.20 |
| 1.000 menit/bulan | ~$250–330 | ~$110–200 |
| Kepatuhan kesehatan | HIPAA add-on **$1.000/bln** | BAA self-service, harga standar |
| Cocok untuk | Kontrol penuh, SOP banyak cabang | Turnkey cepat, klinik kecil |

**Rekomendasi:** mulai pilot dengan **Retell** (murah + cepat produksi; catatan: Kanada memakai PIPEDA, bukan HIPAA, jadi add-on HIPAA Vapi tidak wajib — tapi struktur harga tetap menguntungkan Retell untuk 1 klinik). **Kontrak tools kita platform-agnostic** — `integrations/vapi/tools.json` + bridge server bekerja di keduanya, jadi pindah platform = impor ulang prompt + tools, tanpa ubah kode.
Sumber: [Retell blog](https://www.retellai.com/blog/best-ai-voice-platforms-virtual-receptionists), [perbandingan biaya /menit](https://ainora.lt/blog/ai-voice-agent-cost-per-minute-2026), [Buildberg](https://www.buildberg.co/blog/retell-vs-vapi-vs-bland), [review Vapi](https://www.retellai.com/blog/vapi-ai-review).

**Stack per lapisan:** STT = Deepgram Nova-3 (multibahasa EN+FR code-switching) · LLM = Claude Sonnet (tool use) · TTS = ElevenLabs (EN/FR) + **Azure Speech untuk frasa Inuktitut** · Telephony = Twilio.

## 4. Bahasa: EN / FR sekarang, ᐃᓄᒃᑎᑐᑦ bertahap

| Kemampuan | Status 2026 | Aksi |
|---|---|---|
| **TTS Inuktitut** | ✅ **Tersedia** — suara neural Azure **Siqiniq** (♀) & **Taqqiq** (♂), `iu-Cans-CA` (silabik) & `iu-Latn-CA` (latin); dibangun Microsoft bersama Pemerintah Nunavut dari rekaman warga Nunavut | Pakai sekarang untuk sapaan, konfirmasi, reminder & pengumuman badai dalam IU |
| **STT/ASR Inuktitut** | ❌ Belum ada layanan komersial real-time | Fase berikutnya: pantau proyek NRC Indigenous Languages Technology; sementara: deteksi sapaan IU → tawarkan lanjut EN/FR **atau callback staf penutur IU** (jangan berpura-pura fasih) |
| FR penuh, EN penuh | ✅ | Deepgram Nova-3 multi + prompt bilingual (sudah di system-prompt) |

Sumber: [Microsoft Source Canada](https://news.microsoft.com/source/canada/features/uncategorized/amplifying-inuktitut-voices-in-the-digital-age-with-the-power-of-technology/), [Pemerintah Nunavut](https://www.gov.nu.ca/en/newsroom/government-nunavut-introduces-inuktitut-text-speech-functionality-celebrates-contributions), [Azure language support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support).

## 5. Aturan perilaku khusus (sudah diimplementasi)

- **Jeda natural saat mencari data** — setiap tool di `tools.json` punya pesan `request-start` ("Let me pull up your record real quick…", "Checking the calendar now — one moment…"); tidak pernah ada dead-air > 2 detik.
- **Nomor 7 digit = kode area 867** — dinormalisasi di tiga tempat: engine chat (`js/sila.js`), bridge server (`normalizePhone`), dan instruksi voice prompt ("konfirmasi balik: That's 867-979-1234, correct?"). Nomor lengkap 10/11 digit juga diterima.
- **Jam buka + libur Iqaluit** — 12 libur resmi Nunavut 2026 ada di database (`js/data.js`); engine slot **tidak pernah menawarkan slot di hari libur**, dan Sila menyebut penutupan terdekat saat ditanya jam buka. Tool `get_clinic_status` memberi status live (buka/tutup/badai/libur berikutnya) ke agen voice.
- **Membaca database yang ter-update** — semua jawaban jadwal/pasien lewat store yang sama dengan console staf; booking dari kanal mana pun langsung tampil di kalender & inbox.
- **Keluhan** — didengarkan penuh, diakui dengan empati, dicatat verbatim (`log_complaint`), janji callback manajer 1 hari kerja.
- **Darurat** — maksimal 2 pertanyaan (skala nyeri, demam/bengkak) → `escalate_emergency` paging dokter jaga + tahan slot darurat + instruksi QGH.

## 6. Setup per kanal (dari arsitektur produk 01-dentist, tervalidasi)

| Kanal | Layanan | Cara kerja | Biaya /klinik/bln |
|---|---|---|---|
| ☎️ Telepon | Twilio number → Vapi/Retell | Inbound langsung dijawab Sila; transfer ke front desk / on-call via `transferCall` | Nomor $1 + voice ±$5 + platform $30–80 |
| 💬 SMS | Twilio | Webhook → `POST /webhook/twilio-inbound` → balasan TwiML dari engine Sila; missed-call text-back | ±$11 |
| 🟢 WhatsApp | Twilio WA Business | Sama dengan SMS; di luar jendela 24 jam pakai template ter-approve (`appt_reminder_24h`, `blizzard_reschedule`, `recall_due`, `intake_form`) — approval Meta 1–3 minggu | ±$15 |
| ✉️ Email | Postmark | Inbound parse → klasifikasi intent → auto-reply atau routing ke operator; DKIM/DMARC; patuh CASL (unsubscribe utk marketing) | ±$15 |
| 🌐 Chatbot web | `patient.html` (sudah live) | Demo: engine di browser. Produksi: arahkan widget ke `POST /chat` di bridge agar tersentralisasi | $0 |

**Total estimasi berjalan: ± $75–130 CAD/bulan per klinik** (di luar LLM ±$10–30) — bandingkan dengan resepsionis paruh waktu.

## 7. Integrasi dengan aplikasi yang sudah dibuat

Bridge server (`integrations/server/server.js`, **zero-dependency Node**) sudah:
1. Memakai ulang engine Sila & availability yang sama → paritas perilaku 100% dengan demo web.
2. Menyediakan 10 function-tools sesuai `tools.json` (status klinik, lookup/create patient, slots, book, reschedule, cancel, darurat, keluhan, ringkasan panggilan).
3. Mem-format hasil untuk format webhook Vapi (`message.toolCalls` → `results[]`) *dan* JSON polos (Retell/uji manual).
4. Mencatat semua interaksi ke store → **muncul di inbox console staf**.

**Jalur upgrade produksi** (sudah ada cetak birunya di `Proyek AI aplikasi/products/01-dentist/integrations/`):
demo `db.json` → **Supabase Postgres** (skema `patient/appointment/message/call_log` + enkripsi PII pgcrypto + RLS), reminder via `pg_cron`, engine rule-based → **Claude API + tool use** untuk pemahaman bahasa bebas, host bridge di Railway/Fly/Vercel Functions (region Kanada bila memungkinkan — PIPEDA).

## 8. Roadmap

| Fase | Isi | Durasi |
|---|---|---|
| **1. Pilot voice EN/FR** | Retell + Twilio number + bridge (Supabase), soft-launch after-hours saja ("Sila jawab kalau front desk tidak angkat / di luar jam") | 1–2 minggu |
| **2. SMS + missed-call text-back** | Twilio webhook (kode sudah ada) | 2–3 hari |
| **3. WhatsApp + email** | Daftar WA Business (tunggu approval Meta), Postmark + DNS | 1–3 minggu (menunggu Meta) |
| **4. Full-time + outbound** | Sila jawab semua panggilan ring pertama; kampanye recall & konfirmasi outbound | setelah 1 bln pilot |
| **5. ᐃᓄᒃᑎᑐᑦ voice** | TTS Azure Siqiniq/Taqqiq untuk sapaan/reminder IU; ASR IU menyusul vendor; tinjauan penutur asli semua string | berkelanjutan |

## 9. Checklist aktivasi (akun yang harus Anda buat — tidak bisa diotomasi)

- [ ] Akun **Twilio** + beli nomor lokal 867 (atau port nomor klinik) — perlu kartu kredit
- [ ] Akun **Retell** (atau Vapi) — impor `system-prompt.md`, `tools.json`, `assistant-config.json`
- [ ] Akun **Supabase** (region ca-central bila tersedia) — jalankan skema dari produk 01-dentist
- [ ] Akun **Postmark** + akses DNS domain klinik (DKIM/DMARC)
- [ ] **WhatsApp Business** via Twilio (approval Meta 1–3 minggu — mulai paling awal)
- [ ] **Azure Speech** resource (canadacentral) untuk suara Inuktitut
- [ ] Deploy bridge: `cd integrations/server && node server.js` → host publik + set `WEBHOOK_SHARED_SECRET`
- [ ] Uji: `curl localhost:3100/healthz`, lalu test call end-to-end

---
*Semua angka biaya = estimasi CAD 2026 dari sumber tertaut + dokumen arsitektur internal `01-dentist`. Data pasien demo fiktif.*
