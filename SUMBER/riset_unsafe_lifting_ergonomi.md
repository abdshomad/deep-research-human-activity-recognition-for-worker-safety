# Riset: Postur Ergonomis Pengangkatan Barang dan Dasar Teknis Sistem Deteksi *Unsafe Lifting*

**Tujuan dokumen:** Menjadi bahan rujukan (baseline knowledge) sebelum membangun sistem computer vision untuk mendeteksi postur pengangkatan/pemindahan barang yang tidak ergonomis di lingkungan kerja berat (gudang, produksi, pergudangan, bongkar-muat).

---

## Daftar Isi

1. Latar Belakang & Urgensi
2. Anatomi dan Mekanisme Cedera Musculoskeletal saat Mengangkat
3. Prinsip Dasar Postur Mengangkat yang Aman
4. Klasifikasi Postur *Unsafe Lifting* (Pola-Pola Berbahaya)
5. Standar dan Metode Penilaian Ergonomi Global
6. Regulasi K3 Manual Handling di Indonesia
7. Parameter Kuantitatif (Sudut Sendi) sebagai Basis Deteksi
8. Teknologi Computer Vision untuk Deteksi Unsafe Lifting
9. Rancangan Rule-Set / Logika Deteksi yang Direkomendasikan
10. Studi Kasus & Penelitian Terkait
11. Tantangan Implementasi
12. Kesimpulan & Rekomendasi Langkah Selanjutnya
13. Referensi

---

## 1. Latar Belakang & Urgensi

Aktivitas manual handling (mengangkat, menurunkan, membawa, mendorong, menarik barang secara manual) adalah salah satu penyebab utama gangguan musculoskeletal akibat kerja (Work-related Musculoskeletal Disorders/WMSDs) di sektor gudang, manufaktur, konstruksi, dan logistik. Gangguan ini mencakup cedera pada tulang, otot, sendi, dan ligamen — mulai dari nyeri punggung bawah (Low Back Pain/LBP), Hernia Nukleus Pulposus (HNP)/saraf terjepit, cedera bahu dan lutut, hingga carpal tunnel syndrome.

Beberapa poin kunci yang mendasari urgensi topik ini:

- Manual handling adalah kegiatan yang sangat umum ditemui baik di rumah tangga, perkantoran, maupun industri berat seperti pabrik dan tempat bongkar-muat barang, dengan frekuensi yang bervariasi tergantung jenis pekerjaan.
- Gangguan musculoskeletal termasuk salah satu gangguan kesehatan kerja yang paling sering terjadi secara global, dan berbagai faktor — ukuran/massa objek, postur kerja, frekuensi, serta durasi penanganan manual — baik sendiri maupun kombinasi, dapat menimbulkan aktivitas penanganan yang berbahaya dan berisiko cedera musculoskeletal.
- Riset epidemiologi menunjukkan nyeri punggung bawah akibat kerja (occupational low back pain) merupakan isu kesehatan yang berdampak besar terhadap produktivitas dan menjadi kontributor utama WMSD, di mana postur pengangkatan yang tidak tepat menjadi faktor risiko utama yang **bisa dimodifikasi (modifiable risk factor)** — inilah yang membuka peluang besar bagi sistem deteksi otomatis untuk melakukan intervensi dini sebelum cedera terjadi.
- Praktik industri (misalnya pelatihan sertifikasi Tenaga Kerja Bongkar Muat/TKBM) secara eksplisit mengidentifikasi postur tubuh yang salah — punggung menanggung seluruh beban, bukan kaki — sebagai penyebab umum cedera di lapangan.

**Implikasi bagi sistem deteksi:** karena postur adalah faktor risiko yang paling mudah diobservasi secara visual (dibanding faktor internal seperti kelelahan otot atau kondisi tulang), pose estimation berbasis kamera menjadi pendekatan yang secara alami cocok untuk continuous monitoring dan early-warning system di lantai kerja.

---

## 2. Anatomi dan Mekanisme Cedera Musculoskeletal saat Mengangkat

### 2.1 Struktur yang paling rentan

| Struktur | Jenis Cedera Umum | Pemicu Postur |
|---|---|---|
| Tulang belakang lumbal (L4-L5, L5-S1) | Hernia Nukleus Pulposus (HNP)/saraf terjepit, strain otot punggung bawah | Membungkuk (trunk flexion) berlebihan, terutama dikombinasi dengan beban berat |
| Diskus intervertebralis | Penonjolan/robekan diskus, kompresi saraf | Fleksi tulang belakang + rotasi (twisting) secara bersamaan |
| Sendi bahu & rotator cuff | Strain, tendinitis | Mengangkat dengan lengan terentang jauh dari tubuh, mengangkat di atas kepala |
| Lutut | Strain ligamen, tekanan berlebih pada patella | Squat terlalu dalam berulang, atau justru tidak menekuk lutut sama sekali |
| Otot leher & trapezius | Ketegangan otot, nyeri kronis | Posisi kepala menunduk/leher fleksi berlebihan saat membawa beban |
| Ligamen dan otot inti (core) | Strain/sprain akut | Perubahan postur mendadak, beban asimetris, twisting saat mengangkat |

### 2.2 Mekanisme biomekanika

Saat tubuh membungkuk untuk mengangkat beban dengan punggung (bukan kaki), titik tumpu beban bergeser jauh dari tulang belakang. Ini meningkatkan **momen gaya (torque)** yang harus ditahan oleh otot punggung bawah dan tekanan kompresi pada diskus intervertebralis lumbal secara signifikan — semakin jauh beban dari sumbu tubuh (garis vertikal tulang belakang), semakin besar gaya kompresi yang diterima diskus, meskipun berat beban sama. Kombinasi fleksi tulang belakang dengan rotasi/twisting memperbesar risiko ini karena serat annulus fibrosus pada diskus lebih rentan robek akibat gaya geser (shear force) dibanding gaya tekan murni.

Inilah dasar biomekanis mengapa seluruh standar ergonomi (NIOSH, ISO 11228, REBA/RULA) menempatkan **sudut fleksi batang tubuh (trunk flexion angle)**, **jarak horizontal beban dari tubuh**, dan **twisting/asymmetry** sebagai variabel penentu risiko utama — dan mengapa ketiganya menjadi kandidat fitur paling relevan untuk sistem deteksi berbasis pose estimation.

---

## 3. Prinsip Dasar Postur Mengangkat yang Aman

Berdasarkan konsensus praktik K3/manual handling, berikut adalah teknik pengangkatan yang direkomendasikan secara konsisten oleh berbagai sumber (pelatihan K3, RSUD, lembaga safety):

### 3.1 Sebelum mengangkat
1. **Rencanakan sebelum bergerak** — cek berat, bentuk, dan kestabilan beban; pastikan jalur bebas hambatan; jika beban terlalu berat/besar, gunakan alat bantu (troli, forklift, hand pallet) atau minta bantuan.
2. **Posisikan kaki selebar bahu**, satu kaki sedikit lebih maju (posisi kuda-kuda/garis kekuatan) mengarah ke arah beban akan dibawa untuk menjaga keseimbangan.
3. **Dekatkan tubuh sedekat mungkin ke beban** sebelum mengangkat — semakin dekat beban ke pusat gravitasi tubuh, semakin kecil momen gaya pada punggung.

### 3.2 Saat mengangkat
4. **Tekuk lutut dan pinggul (bukan pinggang/punggung)** — squat, bukan stoop. Turunkan tubuh dengan menekuk lutut sambil menjaga punggung tetap pada posisi netral/lurus (mempertahankan kurva alami tulang belakang, bukan membungkukkan punggung).
5. **Genggam beban dengan mantap** menggunakan seluruh telapak tangan, bukan hanya ujung jari.
6. **Angkat dengan kekuatan otot kaki (paha)**, bukan otot punggung — dorong tubuh naik menggunakan quadriceps sambil menjaga punggung tetap lurus.
7. **Jaga beban sedekat mungkin dengan tubuh** sepanjang proses mengangkat dan membawa (idealnya beban menempel di area perut/dada, bukan terentang di depan tubuh).
8. **Kepala dan pandangan menghadap ke depan**, bukan menunduk — ini secara alami membantu mempertahankan kelurusan tulang belakang.

### 3.3 Saat memutar/membawa
9. **Hindari memutar (twisting) tulang belakang** saat mengangkat maupun membawa beban. Jika perlu berbelok arah, putar seluruh tubuh dengan menggerakkan kaki (melangkah), bukan memutar dari pinggang.
10. **Jangan berhenti mendadak atau membuat gerakan menyentak** saat membawa beban.
11. Untuk beban yang harus dibawa jauh, distribusikan beban secara seimbang (misalnya di kedua tangan atau menggunakan bahu), dan istirahat/bergantian jika perlu.

### 3.4 Saat menurunkan
12. Turunkan beban dengan pola gerakan kebalikan dari mengangkat — tekuk lutut, jaga punggung tetap lurus, letakkan beban secara terkendali (bukan dijatuhkan).

### 3.5 Prinsip administratif pendukung
- Rotasi tugas antara pekerjaan mengangkat dan non-mengangkat untuk mengurangi paparan berulang.
- Optimalisasi tata letak kerja agar barang mudah dijangkau (mengurangi reaching, bending, twisting).
- Penggunaan APD yang sesuai (sepatu safety, sarung tangan, pelindung punggung bila diperlukan).
- Pelatihan berkala dan pengecekan beban/label sebelum mengangkat.

---

## 4. Klasifikasi Postur *Unsafe Lifting* (Pola-Pola Berbahaya)

Untuk keperluan sistem deteksi, postur berbahaya dapat dikelompokkan ke dalam beberapa **kelas pola gerakan** yang secara visual dapat dibedakan melalui pose estimation:

| Kelas Postur Tidak Aman | Deskripsi | Indikator Visual (Pose) |
|---|---|---|
| **Stoop Lifting** (membungkuk) | Mengangkat dengan menekuk pinggang/punggung, lutut relatif lurus | Sudut fleksi batang tubuh besar (>45–60°), sudut lutut mendekati 180° (lurus) |
| **Twisted Lifting** (memutar) | Mengangkat/membawa sambil memutar tulang belakang | Perbedaan orientasi sumbu bahu vs sumbu pinggul (asymmetry angle) |
| **Asymmetric/One-sided Lifting** | Beban tidak simetris, hanya satu sisi tubuh yang menahan beban | Perbedaan tinggi bahu kiri-kanan, kemiringan lateral batang tubuh |
| **Overreaching Lift** | Mengangkat dengan beban jauh dari tubuh (lengan terentang penuh) | Jarak horizontal pergelangan tangan ke pinggul besar |
| **Overhead/High Lift berisiko** | Mengangkat beban di atas level bahu tanpa bantuan alat | Posisi pergelangan tangan di atas garis bahu, sudut siku/bahu ekstrem |
| **Squat Lift berlebihan (deep knee bend)** | Lutut menekuk sangat dalam secara berulang | Sudut lutut sangat kecil (<70–90°) dengan frekuensi tinggi |
| **Sudden/Jerky Movement** | Gerakan mengangkat mendadak/menghentak (bukan kontrol halus) | Percepatan sudut/velocity antar-frame tinggi (fitur temporal, bukan statis) |
| **Static Awkward Holding** | Menahan beban dalam postur janggal dalam waktu lama | Postur berisiko bertahan melewati durasi ambang tertentu |

Catatan penting: dua kategori terakhir bersifat **temporal** (butuh analisis multi-frame/video), bukan hanya dari satu citra statis — ini relevan untuk desain arsitektur sistem (perlu tracking/sequence model, bukan hanya deteksi per-frame).

---

## 5. Standar dan Metode Penilaian Ergonomi Global

### 5.1 NIOSH Lifting Equation (Revised NIOSH Lifting Equation / RNLE, 1994)

Dikembangkan oleh *National Institute for Occupational Safety and Health* (AS), metode ini menghitung **Recommended Weight Limit (RWL)** — beban maksimum yang dapat diangkat oleh hampir semua pekerja sehat tanpa peningkatan risiko nyeri punggung bawah — dan **Lifting Index (LI)** sebagai estimasi tingkat risiko relatif dari sebuah tugas mengangkat.

**Formula RWL:**

```
RWL = LC × HM × VM × DM × AM × FM × CM
```

Di mana:
- **LC (Load Constant)** = 23 kg (≈51 lb), beban maksimum ideal dalam kondisi optimal
- **HM (Horizontal Multiplier)** = faktor berdasarkan jarak horizontal tangan dari titik tengah tubuh
- **VM (Vertical Multiplier)** = faktor berdasarkan ketinggian tangan dari lantai saat awal angkat
- **DM (Distance Multiplier)** = faktor berdasarkan jarak vertikal perpindahan beban
- **AM (Asymmetry Multiplier)** = faktor berdasarkan sudut twisting/rotasi tubuh
- **FM (Frequency Multiplier)** = faktor berdasarkan frekuensi & durasi mengangkat
- **CM (Coupling Multiplier)** = faktor berdasarkan kualitas genggaman/pegangan pada beban

**Lifting Index (LI) = Berat Beban Aktual / RWL**

- LI ≤ 1.0 → risiko rendah/nominal bagi pekerja sehat
- LI > 1.0 → risiko meningkat seiring nilai LI membesar; sebagian populasi pekerja berisiko cedera

RNLE banyak dipakai sebagai kerangka acuan kuantitatif dan menjadi rujukan otoritas ketenagakerjaan (termasuk OSHA di AS) meski sifatnya bukan aturan hukum wajib, melainkan panduan teknis berbasis riset ergonomi.

### 5.2 REBA (Rapid Entire Body Assessment)

Dikembangkan oleh Hignett & McAtamney (2000), REBA menilai risiko MSD dengan menganalisis seluruh tubuh (Grup A: batang tubuh/trunk, leher/neck, kaki/legs; Grup B: lengan atas, lengan bawah, pergelangan tangan), lalu menggabungkannya dengan faktor beban/force dan aktivitas otot menjadi skor akhir 1–15+ beserta level tindakan yang diperlukan.

**Skema skor fleksi batang tubuh (trunk) pada REBA — relevan untuk threshold deteksi:**

| Sudut Fleksi Trunk | Skor REBA |
|---|---|
| Posisi netral (~0°) | 1 |
| Fleksi/ekstensi 0°–20° | 2 |
| Fleksi 20°–60°, atau ekstensi >20° | 3 |
| Fleksi >60° | 4 |
| +1 tambahan jika disertai *twisting* atau *lateral bending* | — |

**Skema skor leher (neck):**
- Fleksi 0°–20° → skor 1
- Fleksi >20° atau ekstensi → skor 2
- +1 jika disertai twisting/lateral bending

**Skor kaki (legs):** berdasarkan tumpuan berat badan (bilateral/unilateral) ditambah penyesuaian derajat fleksi lutut.

REBA secara khusus dirancang cocok untuk tugas dinamis seperti mengangkat dan menangani barang karena mencakup seluruh tubuh dan mempertimbangkan pengubah aktivitas dinamis (dynamic activity modifiers) — menjadikannya kerangka paling relevan untuk sistem deteksi visual dibanding RULA yang berfokus pada tubuh bagian atas saja.

### 5.3 RULA (Rapid Upper Limb Assessment)

RULA berfokus pada leher, batang tubuh, dan anggota gerak atas (bahu, lengan, pergelangan tangan) — cocok untuk tugas repetitif tubuh bagian atas, namun kurang komprehensif untuk tugas mengangkat penuh tubuh dibanding REBA karena tidak menilai kaki secara mendalam. Skor akhir berkisar 1–7 dengan action level 1–4.

### 5.4 ISO 11228 (Seri Standar Internasional Manual Handling)

Seri ISO 11228 adalah standar internasional untuk penilaian ergonomi penanganan beban manual, mencakup:
- **ISO 11228-1** — Lifting, lowering, and carrying (mengangkat, menurunkan, membawa); mengadopsi basis RNLE, berlaku untuk objek ≥3 kg, kondisi jalan datar dengan kecepatan berjalan sedang, berbasis hari kerja 8 jam (dapat diperluas hingga 12 jam), dengan massa referensi ideal 25 kg sebagai titik awal penilaian.
- **ISO 11228-2** — Pushing and pulling (mendorong dan menarik)
- **ISO 11228-3** — Handling of low loads at high frequency (penanganan beban ringan berfrekuensi tinggi, repetitive)

Standar ini tidak mencakup penanganan orang/hewan, penggunaan alat bantu angkat seperti eksoskeleton, atau kebutuhan khusus ibu hamil/penyandang disabilitas.

### 5.5 Ringkasan Perbandingan Metode

| Metode | Fokus Tubuh | Cocok untuk | Output |
|---|---|---|---|
| NIOSH RNLE | Seluruh tugas angkat (posisi tangan, beban, frekuensi) | Analisis tugas spesifik, estimasi batas aman beban | RWL (kg), Lifting Index |
| REBA | Seluruh tubuh (trunk, neck, legs, arms) | Tugas dinamis, lifting, handling kompleks | Skor 1–15+, action level |
| RULA | Leher, trunk, anggota gerak atas | Tugas repetitif tubuh atas | Skor 1–7, action level |
| ISO 11228 | Lifting/lowering/carrying/push-pull | Kerangka regulasi internasional | Batas berat & rekomendasi |

---

## 6. Regulasi K3 Manual Handling di Indonesia

- **Permenakertrans No. Per.01/MEN/1978** tentang Keselamatan dan Kesehatan Kerja dalam Penebangan dan Pengangkutan Kayu — mengatur jenis pekerjaan angkat-angkut beban maksimum yang diperkenankan agar tidak menimbulkan kecelakaan kerja (salah satu regulasi awal terkait batas beban angkat manual di Indonesia).
- **Permenaker No. 5 Tahun 2018** tentang Keselamatan dan Kesehatan Kerja Lingkungan Kerja — menjadi acuan terkini yang relevan dengan ergonomi dan pengukuran lingkungan kerja, termasuk aspek manual handling.
- Praktik industri di Indonesia umumnya merujuk kombinasi **standar NIOSH & ISO 11228** sebagai kerangka teknis, dengan batas aman beban angkat ideal sekitar 23 kg dalam kondisi optimal (sejalan dengan Load Constant NIOSH), yang kemudian disesuaikan dengan faktor jarak, postur, dan frekuensi angkat aktual di lapangan.
- Lembaga sertifikasi K3 (Ahli K3 Umum Kemnaker) dan pelatihan sektor spesifik (mis. Tenaga Kerja Bongkar Muat/TKBM di pelabuhan) mengintegrasikan prinsip ergonomi ini ke dalam kurikulum praktik keselamatan kerja nasional.

---

## 7. Parameter Kuantitatif (Sudut Sendi) sebagai Basis Deteksi

Berikut rangkuman ambang batas sudut yang **dapat langsung diadaptasi menjadi threshold rule** dalam sistem deteksi berbasis pose estimation (mengacu pada REBA, RNLE, dan literatur biomekanika lifting):

| Parameter Sudut | Kategori Aman | Kategori Waspada | Kategori Berbahaya | Sumber Acuan |
|---|---|---|---|---|
| Fleksi batang tubuh (trunk-vertikal) | 0°–20° | 20°–60° | >60° | REBA |
| Fleksi leher | 0°–20° | >20° (fleksi/ekstensi) | Fleksi ekstrem + twisting | REBA |
| Twisting/asymmetry trunk (rotasi horizontal bahu vs pinggul) | Minimal/tidak ada | Sedang | Signifikan, disertai lateral bending | REBA, NIOSH (Asymmetry Multiplier) |
| Fleksi lutut saat mengangkat | Tertekuk moderat (mendekati posisi squat, ~90°–135°) | Terlalu lurus (stoop) atau terlalu dalam (<70°) berulang | Ekstrem pada kedua sisi | Prinsip manual handling + REBA legs score |
| Jarak horizontal beban–tubuh (pergelangan tangan ke pinggul) | Dekat dengan tubuh | Sedang | Jauh/lengan terentang penuh (overreach) | NIOSH (Horizontal Multiplier) |
| Ketinggian tangan saat mulai mengangkat | Sekitar tinggi buku jari/knuckle (~75 cm dari lantai) | Di bawah lutut atau di atas bahu | Dari lantai penuh atau di atas kepala | NIOSH (Vertical Multiplier) |
| Simetri tinggi bahu kiri-kanan | Sejajar | Sedikit miring | Miring signifikan (beban satu sisi) | Indikator postur asimetris |

> **Catatan teknis penting:** REBA secara eksplisit memiliki keterbatasan sensitivitas — postur dengan fleksi 21° dan 59° bisa mendapat skor trunk yang sama meski beban biomekanis pada tubuh sangat berbeda. Untuk sistem deteksi berbasis computer vision, disarankan **tidak hanya mereplikasi skor kategori REBA**, tetapi menyimpan **nilai sudut kontinu (continuous angle value)** sebagai fitur, sehingga sistem dapat memberi peringatan bertingkat (graded warning) alih-alih hanya biner aman/tidak aman.

---

## 8. Teknologi Computer Vision untuk Deteksi Unsafe Lifting

### 8.1 Konsep Pose Estimation

Pose estimation adalah tugas computer vision untuk mendeteksi dan melokalisasi titik-titik anatomis tubuh (keypoints) seperti bahu, siku, pergelangan tangan, pinggul, lutut, dan pergelangan kaki dari citra/video, lalu menghubungkannya menjadi representasi skeleton/kerangka yang menggambarkan postur dan pergerakan subjek. Berbeda dari deteksi objek yang hanya menghasilkan bounding box, pose estimation memberikan informasi struktural tentang **bagaimana** posisi tubuh seseorang, bukan sekadar **di mana** posisinya.

Aplikasi keselamatan kerja menggunakan pose estimation banyak diterapkan di sektor manufaktur dan konstruksi untuk mendeteksi postur tidak aman seperti teknik mengangkat yang salah, pekerja memasuki zona terlarang, atau kegagalan menjaga jarak aman dari mesin.

### 8.2 Model/Library Pose Estimation yang Umum Digunakan

| Model/Framework | Pendekatan | Karakteristik |
|---|---|---|
| **OpenPose** | Bottom-up | Library open-source populer, menggunakan CNN + Part Affinity Fields, mendukung multi-person |
| **MediaPipe Pose** | Top-down, ringan | Cocok real-time di perangkat mobile/edge, ekstraksi cepat, umum untuk aplikasi lapangan |
| **AlphaPose** | Top-down | Akurasi deteksi joint tinggi per individu, banyak dipakai riset akademik |
| **MoveNet** | Top-down, ringan | Dioptimalkan untuk real-time pada perangkat terbatas |
| **HigherHRNet** | Bottom-up | Akurasi tinggi untuk skenario ramai (crowded scenes) |
| **YOLO-Pose (mis. YOLOv8/v11-pose)** | Single-stage | Deteksi + pose estimation dalam satu model, cocok untuk deployment real-time di CCTV gudang |

**Pertimbangan pemilihan untuk konteks gudang/produksi:**
- **Bottom-up** (OpenPose, HigherHRNet) lebih unggul di area kerja padat/ramai karena tidak bergantung pada deteksi individu terlebih dahulu, dan performanya tidak menurun signifikan seiring bertambahnya jumlah orang dalam frame.
- **Top-down** (AlphaPose, MediaPipe, MoveNet) umumnya lebih akurat per-individu tetapi melambat bila banyak pekerja dalam satu frame.
- Untuk **CCTV gudang dengan banyak pekerja**, kombinasi deteksi objek/orang (misalnya YOLO) + pose estimation top-down per-individu yang terdeteksi seringkali menjadi pendekatan praktis.

### 8.3 Set Keypoints Standar

**COCO format (17 keypoints)** — umum dipakai OpenPose/YOLO-Pose:
Hidung, mata kiri/kanan, telinga kiri/kanan, bahu kiri/kanan, siku kiri/kanan, pergelangan tangan kiri/kanan, pinggul kiri/kanan, lutut kiri/kanan, pergelangan kaki kiri/kanan.

**MediaPipe Pose (33 landmarks)** — lebih detail, mencakup titik tambahan pada wajah, tangan (ibu jari, jari kelingking, indeks), dan kaki (tumit, ujung kaki) — berguna bila dibutuhkan presisi lebih tinggi pada tangan/kaki untuk analisis genggaman (coupling) atau posisi tumpuan kaki.

### 8.4 Pipeline Umum Sistem Deteksi Unsafe Lifting

```
1. Input video (CCTV/kamera area kerja)
        ↓
2. Deteksi & tracking manusia per-frame (person detector, mis. YOLO)
        ↓
3. Ekstraksi keypoints/skeleton per individu (pose estimator)
        ↓
4. Hitung fitur biomekanis:
   - Sudut fleksi trunk (garis bahu-pinggul terhadap vertikal)
   - Sudut fleksi lutut, siku, leher
   - Asimetri/twisting (perbedaan orientasi sumbu bahu vs pinggul)
   - Jarak horizontal pergelangan tangan terhadap pinggul
   - (opsional) Estimasi berat beban dari deteksi objek yang dipegang
        ↓
5. Klasifikasi postur:
   a) Rule-based (threshold sudut, mis. REBA-like scoring), atau
   b) Machine learning (klasifikasi postur aman/tidak dari fitur sudut + temporal),
      dilatih dari dataset video lifting benar vs salah
        ↓
6. Analisis temporal (opsional, untuk gerakan mendadak/durasi menahan postur)
        ↓
7. Output: skor risiko / label (aman, waspada, berbahaya) + alert/log
```

### 8.5 Pendekatan Rule-Based vs Machine Learning

| Aspek | Rule-Based (mis. REBA-like scoring) | Machine Learning (klasifikasi berbasis data) |
|---|---|---|
| Kebutuhan data latih | Tidak perlu, langsung pakai threshold ilmiah | Perlu dataset video/gambar lifting berlabel benar/salah |
| Interpretability | Tinggi, mudah dijelaskan ke pekerja/manajemen | Lebih sulit dijelaskan (kecuali pakai fitur sudut yang sama sebagai input) |
| Fleksibilitas | Kaku terhadap variasi postur/kamera | Lebih adaptif terhadap variasi sudut kamera, tipe beban, gaya tubuh individu |
| Risiko | Bisa gagal pada kasus edge/postur tidak terduga | Bisa "black box" & butuh validasi ergonomi berkala |
| Rekomendasi | Baik untuk *baseline*/MVP awal | Baik untuk *penyempurnaan* setelah baseline berjalan, idealnya **hybrid**: fitur sudut (rule-based) sebagai input ke model ML/temporal (mis. LSTM, ST-GCN) untuk klasifikasi akhir |

Riset akademik yang relevan menunjukkan sistem markerless berbasis kamera smartphone yang diintegrasikan dengan model deep learning mampu mengklasifikasikan postur lifting benar vs salah, dengan pendekatan pengumpulan data melibatkan partisipan yang melakukan tugas mengangkat kotak dengan variasi ukuran, berat, dan sudut kamera untuk membangun dataset yang representatif. Riset lain menegaskan bahwa pose estimation markerless berbasis video monokular mampu memulihkan sudut sendi yang cukup akurat untuk keperluan penilaian ergonomi otomatis (automated REBA/RULA scoring), tanpa memerlukan sensor wearable/instrumented garment.

---

## 9. Rancangan Rule-Set / Logika Deteksi yang Direkomendasikan

Sebagai titik awal (baseline) sebelum masuk ke tahap machine learning yang lebih kompleks, berikut rancangan logika deteksi berbasis aturan yang dapat langsung diimplementasikan dari keypoints pose estimation:

**Fitur yang dihitung dari skeleton per-frame:**
- `trunk_angle` = sudut antara vektor (midpoint bahu → midpoint pinggul) terhadap sumbu vertikal
- `knee_angle` = sudut pada sendi lutut (hip–knee–ankle)
- `neck_angle` = sudut antara vektor (midpoint bahu → hidung/telinga) terhadap sumbu vertikal batang tubuh
- `trunk_twist` = selisih sudut orientasi garis bahu (kiri-kanan) vs garis pinggul (kiri-kanan) pada bidang horizontal
- `wrist_hip_distance` = jarak horizontal rata-rata pergelangan tangan terhadap pinggul (dinormalisasi terhadap tinggi tubuh)
- `shoulder_tilt` = selisih ketinggian bahu kiri vs kanan (indikator beban asimetris)

**Contoh logika klasifikasi bertingkat (dapat dikalibrasi ulang sesuai kondisi lapangan):**

```
IF trunk_angle > 60°  OR (trunk_angle > 20° AND trunk_twist > threshold_sedang)
    → BERBAHAYA (postur stoop/twisted lifting)

ELIF trunk_angle BETWEEN 20°–60° AND knee_angle mendekati lurus (>150°)
    → BERBAHAYA (mengangkat dengan punggung, bukan kaki)

ELIF wrist_hip_distance > threshold_jauh
    → WASPADA (overreaching)

ELIF shoulder_tilt > threshold_asimetri
    → WASPADA (beban tidak simetris)

ELIF trunk_angle <= 20° AND knee_angle mengindikasikan squat proporsional
    → AMAN

ELSE
    → WASPADA (perlu evaluasi lanjut / fitur temporal)
```

**Lapisan tambahan yang direkomendasikan:**
1. **Temporal smoothing** — hindari false alert dari noise satu frame; gunakan rata-rata bergerak (moving average) beberapa frame sebelum klasifikasi final.
2. **Durasi postur berisiko** — beri bobot lebih tinggi jika postur berbahaya bertahan lebih dari X detik (indikasi static awkward holding).
3. **Deteksi gerakan menghentak** — hitung percepatan sudut antar-frame untuk mendeteksi gerakan tiba-tiba (sudden jerk).
4. **Kalibrasi sudut kamera** — sudut yang dihitung dari citra 2D perlu dikoreksi terhadap sudut pandang kamera (bird's eye vs sudut miring) agar estimasi trunk_angle akurat; pertimbangkan multi-camera atau estimasi pose 3D bila akurasi kritis.
5. **Validasi ergonomi berkala** — threshold awal sebaiknya divalidasi/disesuaikan bersama ahli K3/ergonom di lokasi kerja aktual, bukan hanya dari literatur.

---

## 10. Studi Kasus & Penelitian Terkait

- Penelitian *Automatic Detect Incorrect Lifting Posture with the Pose Estimation Model* mengembangkan sistem markerless berbasis kamera smartphone yang diintegrasikan dengan model deep learning untuk mengklasifikasikan postur lifting, dengan data dikumpulkan dari partisipan yang melakukan variasi tugas mengangkat kotak berbagai ukuran dan berat, direkam dari berbagai sudut dan ketinggian kamera.
- Riset ergonomi berbasis sensor wearable (sEMG) dan machine learning juga dikembangkan sebagai pelengkap/pembanding untuk penilaian risiko ergonomi otomatis di lingkungan manual material handling, mengonfirmasi bahwa postur janggal berulang dan penanganan beban tidak aman termasuk isu ergonomi teratas di industri kerja berat.
- Riset terbaru mengeksplorasi pendekatan privacy-preserving menggunakan sensor mmWave untuk automated REBA scoring — relevan sebagai referensi alternatif bila terdapat kekhawatiran privasi pekerja terhadap CCTV konvensional.
- Studi tentang pose estimation untuk pemantauan keselamatan konstruksi menegaskan bahwa penilaian ergonomi otomatis tradisional (REBA/RULA manual) sifatnya episodik dan bergantung observer terlatih, sementara pendekatan skeleton-based memungkinkan pemantauan yang lebih berkelanjutan (continuous monitoring).

---

## 11. Tantangan Implementasi

| Tantangan | Penjelasan | Mitigasi yang Mungkin |
|---|---|---|
| Oklusi (occlusion) | Pekerja/rak/barang menghalangi keypoints tertentu | Multi-kamera, model pose estimation robust terhadap oklusi parsial, interpolasi temporal |
| Sudut kamera & perspektif | Sudut trunk 2D bisa terdistorsi tergantung posisi kamera | Kalibrasi kamera, pose estimation 3D bila memungkinkan, penempatan kamera standar |
| Variasi pencahayaan gudang | Gudang sering minim cahaya/backlight | Model yang dilatih pada kondisi pencahayaan bervariasi, kamera IR/low-light |
| Privasi pekerja | Rekaman wajah/identitas pekerja | Anonymisasi (blur wajah), representasi skeleton-only untuk penyimpanan data |
| Definisi "beban berat" | Sistem visual sulit menaksir berat aktual barang | Kombinasikan dengan data dari sensor timbangan/RFID pada barang, atau estimasi ukuran objek sebagai proxy |
| False positive/negative | Threshold terlalu ketat/longgar bisa mengurangi kepercayaan pengguna | Validasi lapangan bertahap, feedback loop dengan tim K3, kalibrasi ambang batas |
| Perbedaan antropometri pekerja | Tinggi/proporsi tubuh berbeda mempengaruhi sudut absolut | Normalisasi fitur terhadap tinggi tubuh/panjang segmen tubuh individu |
| Multi-person crowded scene | Banyak pekerja dalam satu frame kamera | Model bottom-up atau kombinasi detector + tracker yang robust |

---

## 12. Kesimpulan & Rekomendasi Langkah Selanjutnya

1. **Dasar ilmiah sudah matang** — kombinasi NIOSH Lifting Equation, REBA, RULA, dan ISO 11228 memberikan kerangka kuantitatif yang jelas (khususnya ambang sudut fleksi trunk, leher, dan lutut) yang dapat langsung diterjemahkan menjadi *threshold rule* untuk sistem deteksi berbasis pose estimation.
2. **REBA paling relevan sebagai kerangka utama** karena mencakup seluruh tubuh dan cocok untuk tugas dinamis seperti lifting, dibanding RULA yang hanya fokus tubuh atas.
3. **Trunk flexion angle, twisting, dan jarak horizontal beban dari tubuh** adalah tiga fitur biomekanis dengan bobot risiko tertinggi dan paling mudah diekstraksi dari skeleton keypoints — jadikan ini sebagai fitur inti (core features) sistem.
4. **Pendekatan hybrid direkomendasikan**: mulai dari rule-based threshold (mudah divalidasi, cepat deploy) sebagai MVP, lalu kembangkan ke arah machine learning/temporal model (mis. ST-GCN, LSTM atas sequence sudut) untuk menangkap pola dinamis seperti gerakan menghentak dan durasi menahan postur berisiko.
5. **Butuh dataset lokal** — sebaiknya kumpulkan video pengangkatan aktual di lokasi kerja target (dengan variasi jenis barang, pekerja, sudut kamera) untuk memvalidasi ulang threshold yang diambil dari literatur, karena kondisi lapangan riil (jenis rak, ketinggian kerja, jenis APD) dapat berbeda dari kondisi laboratorium riset.
6. **Pertimbangkan aspek non-teknis**: privasi pekerja, komunikasi tujuan sistem (bukan untuk menghukum tapi mencegah cedera), serta integrasi dengan program K3 dan pelatihan manual handling yang sudah berjalan agar sistem deteksi benar-benar menurunkan angka cedera, bukan sekadar menjadi alat pengawasan.

**Langkah selanjutnya yang disarankan sebelum membangun sistem:**
- Tentukan model pose estimation yang akan dipakai (pertimbangkan real-time requirement, jumlah pekerja per frame, dan hardware yang tersedia).
- Susun spesifikasi teknis threshold awal berdasarkan tabel Bagian 7, lalu rencanakan sesi validasi dengan ahli K3/ergonom di lokasi kerja.
- Rancang skema anotasi data (jika akan membangun/fine-tune model klasifikasi) yang selaras dengan kelas postur pada Bagian 4.
- Tentukan output sistem yang diinginkan: alert real-time, dashboard skor risiko harian, log historis untuk audit K3, atau kombinasi ketiganya.

---

## 13. Referensi

1. CDC/NIOSH — *Ergonomic Guidelines for Manual Material Handling*. https://www.cdc.gov/niosh/docs/2007-131/pdfs/2007-131.pdf
2. Ergo-Plus — *A Step-by-Step Guide to Using the NIOSH Lifting Equation for Single Tasks*. https://ergo-plus.com/niosh-lifting-equation-single-task/
3. Ergo-Plus — *NIOSH Lifting Equation Guide (PDF)*. https://ergo-plus.com/wp-content/uploads/NIOSH-guide-v-5.5.pdf
4. na.bhs1.com — *The NIOSH Lifting Equation in OSHA Ergonomics Guidelines*. https://na.bhs1.com/blog/post/osha-uses-niosh-lifting-equation-address-ergonomic-hazards-manual-material-handling-tasks
5. Amaya F., Argayoso K.C., Tatlonghari R.A. (2019) — *NIOSH Lifting Equation for Assessing Manual Material Handling Technique in a Warehouse Company*. International Journal of Engineering Management, 3(2), 40-45.
6. arXiv (2109.15036) — *Automated Workers Ergonomic Risk Assessment in Manual Material Handling using sEMG Wearable Sensors and Machine Learning*. https://arxiv.org/pdf/2109.15036
7. Ergo-Plus — *A Step-by-Step Guide to the REBA Assessment Tool*. https://ergo-plus.com/reba-assessment-tool-guide/
8. Ergo-Plus — *A Step-by-Step Guide to the RULA Assessment Tool*. https://ergo-plus.com/rula-assessment-tool-guide/
9. Retrocausal — *A Complete Guide for Using REBA Assessment Tool*. https://retrocausal.ai/blog/reba-assessment/
10. Ergonautas UPV — *REBA Software: Ergonomics Software for Worksites*. https://www.ergonautas.upv.es/ergoniza/app_en/land/index.html?method=reba
11. xsens.com — *Occupation Health and Safety Basics: A Deep Dive into RULA and REBA Standards*. https://www.xsens.com/resources/blog/occupational-health-and-safety-a-deep-dive-into-rula-and-reba-standards
12. ScienceDirect — *A New Scoring System for the Rapid Entire Body Assessment (REBA) Based on Fuzzy Sets and Bayesian Networks*. https://www.sciencedirect.com/science/article/abs/pii/S016981412030648X
13. ISO — *ISO 11228-1:2021, Ergonomics — Manual handling — Part 1: Lifting, lowering and carrying*. https://www.iso.org/standard/76820.html
14. ISO — *ISO 11228-1:2003, Ergonomics — Manual handling — Part 1: Lifting and carrying*. https://www.iso.org/obp/ui/#iso:std:iso:11228:-1:ed-1:v1:en
15. Schmalz — *ISO 11228 Glossary*. https://www.schmalz.com/en-si/support/know-how/glossary/iso-11228
16. MSD Prevention Guideline for Ontario — *ISO 11228-1:2021 Ergonomics*. https://www.msdprevention.com/resource-library/iso-11228-12021-ergonomics-manual-handling-part-1-lifting-lowering-carrying
17. PMC — *Automatic Detect Incorrect Lifting Posture with the Pose Estimation Model*. https://pmc.ncbi.nlm.nih.gov/articles/PMC11943959/ dan https://www.mdpi.com/2075-1729/15/3/358
18. arXiv (2605.19869) — *Passive Construction Site Safety Monitoring via Persona-Scaffolded Adversarial Chain-of-Thought VLM Verification*. https://arxiv.org/pdf/2605.19869
19. arXiv (2607.02611) — *Privacy-Preserving Industrial Ergonomics: mmWave-Based Automated REBA Scoring and Pose Estimation*. https://arxiv.org/pdf/2607.02611
20. Datature — *What Is Pose Estimation? Keypoint Detection Explained*. https://datature.io/blog/what-is-pose-estimation-keypoint-detection-explained-2026
21. Ultralytics — *Ultimate Guide to Pose Estimation Tools & Techniques*. https://www.ultralytics.com/blog/the-ultimate-guide-to-pose-estimation-tools
22. essenn.associates — *Pose Estimation & Human Body Tracking — Real-Time Skeleton Detection Guide*. https://essenn.associates/blog-pose-estimation-human-body-tracking.html
23. Port Academy — *Cara Efektif Mengangkat Barang Berat dengan Aman*. https://portacademy.id/cara-efektif-mengangkat-barang-berat-dengan-aman/
24. Indonesia Safety Center — *6 Teknik Kunci Pengangkatan Manual yang Benar*. https://indonesiasafetycenter.org/6-teknik-kunci-pengangkatan-manual-yang-benar/
25. RSUD Nunukan — *Posisi Ergonomis dalam Aktivitas Sehari-hari*. https://rsud.nunukankab.go.id/detailpost/posisi-ergonomis-dalam-aktivitas-sehari-hari
26. Jurnal Karya Pengabdian (JKP), Vol. 7 No. 2 (2025), Universitas Mataram — *Pengenalan Prinsip Ergonomi dalam Angkat-angkut Peralatan di Laboratorium Listrik Dasar*. https://jkp.unram.ac.id/index.php/JKP/article/download/225/225/1456
27. Sentra Kalibrasi Industri — *Cara Mengangkat Barang yang Benar Supaya Tidak Cedera*. https://www.sentrakalibrasiindustri.com/cara-mengangkat-barang-yang-benar-supaya-tidak-cedera/
28. AKUALITA — *Manual Handling di Tempat Kerja: Risiko & Solusi K3*. https://akualita.com/new/assessment-manual-handling-k3/

---

*Dokumen ini adalah hasil riset awal untuk mendukung perancangan sistem deteksi unsafe lifting berbasis computer vision. Rekomendan threshold sudut pada Bagian 7 dan 9 bersifat titik awal (starting point) dan perlu divalidasi ulang dengan data lapangan serta masukan ahli K3/ergonom sebelum digunakan sebagai acuan final produksi.*
