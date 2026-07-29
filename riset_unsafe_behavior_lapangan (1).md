# Riset Lanjutan: Postur dan Perilaku Berbahaya (Unsafe Act) Lainnya di Lapangan Kerja

**Dokumen ini melengkapi riset sebelumnya** (`riset_unsafe_lifting_ergonomi.md`) yang berfokus pada postur mengangkat barang. Di sini cakupan diperluas ke seluruh spektrum **perilaku tidak aman (unsafe act/unsafe behavior)** yang umum terjadi di lingkungan kerja berat seperti gudang, pabrik, dan area produksi — termasuk berlari, merokok, tidak memakai APD, memasuki zona berbahaya, interaksi dengan kendaraan/alat berat, bekerja di ketinggian, kelelahan, dan perilaku berisiko lainnya — lengkap dengan pendekatan computer vision untuk mendeteksi masing-masing perilaku tersebut.

---

## Daftar Isi

1. Mengapa Cakupan Perlu Diperluas dari Lifting ke Unsafe Act Secara Umum
2. Kerangka Konseptual: Unsafe Act vs Unsafe Condition
3. Data & Konteks Kecelakaan Kerja di Indonesia
4. Taksonomi Lengkap Perilaku Berbahaya di Lapangan
5. Pembahasan Mendalam per Kategori Perilaku
6. Ringkasan Teknologi Computer Vision per Kategori
7. Arsitektur Sistem Deteksi Multi-Perilaku (Terintegrasi)
8. Matriks Prioritas Implementasi
9. Tantangan Teknis & Etis
10. Kesimpulan & Rekomendasi
11. Referensi

---

## 1. Mengapa Cakupan Perlu Diperluas dari Lifting ke Unsafe Act Secara Umum

Postur mengangkat yang tidak ergonomis (unsafe lifting) hanyalah **satu jenis** dari kategori besar yang dalam ilmu K3 disebut **unsafe act/unsafe behavior** (tindakan tidak aman). Riset dan statistik kecelakaan kerja secara konsisten menunjukkan bahwa tindakan tidak aman adalah kontributor dominan terhadap kecelakaan kerja, jauh melampaui kontribusi kondisi lingkungan yang tidak aman (unsafe condition). Karena itu, sistem deteksi berbasis computer vision di lapangan kerja berat idealnya tidak berhenti di satu jenis postur saja, melainkan dirancang sebagai **platform deteksi perilaku tidak aman secara menyeluruh**, dengan unsafe lifting sebagai salah satu modulnya.

---

## 2. Kerangka Konseptual: Unsafe Act vs Unsafe Condition

### 2.1 Heinrich's Law / Teori Domino

Herbert William Heinrich, perintis teori keselamatan industri pada era 1930-an, meninjau ribuan laporan kecelakaan kerja dan menyimpulkan bahwa **sekitar 88% kecelakaan kerja disebabkan oleh tindakan tidak aman (unsafe act)** dari pekerja, sementara sisanya disebabkan oleh kondisi tidak aman (unsafe condition) dan faktor yang tidak dapat dihindari. Studi lanjutan yang mengacu pada teori ini kemudian menjadi dasar pendekatan **Behavior-Based Safety (BBS)**, yang berfokus pada identifikasi dan modifikasi perilaku berisiko pekerja secara sistematis. Perlu dicatat, karya asli Heinrich sebenarnya juga mendorong perusahaan untuk mengendalikan bahaya di lingkungan kerja, bukan semata-mata menyalahkan perilaku pekerja — dan angka 88% ini juga mendapat kritik ilmiah karena metodologinya yang sudah tua dan cenderung menyederhanakan sebab-akibat kecelakaan yang sesungguhnya multifaktor.

**Heinrich's Safety Triangle (Piramida Keselamatan)** menggambarkan rasio 1:29:300 — untuk setiap 1 kecelakaan besar/fatal, terdapat sekitar 29 kecelakaan ringan, dan 300 kejadian nyaris celaka (near-miss) tanpa cedera. Implikasinya bagi sistem deteksi: **mendeteksi dan mencatat near-miss serta perilaku berisiko secara dini** (bukan hanya insiden yang sudah terjadi) adalah strategi paling efektif untuk mencegah kecelakaan fatal — ini pula yang menjadi nilai jual utama sistem computer vision dibanding pengawasan manual, karena mampu memantau secara kontinu dan mencatat kejadian yang biasanya luput dari observasi manusia.

### 2.2 Definisi Unsafe Act dan Unsafe Condition

| Istilah | Definisi | Contoh |
|---|---|---|
| **Unsafe Action/Act** (tindakan tidak aman) | Perilaku pekerja yang menyimpang dari prosedur atau standar keselamatan | Tidak memakai APD, berlari di area kerja, merokok di zona terlarang, postur mengangkat salah |
| **Unsafe Condition** (kondisi tidak aman) | Kondisi lingkungan/fasilitas kerja yang berbahaya, di luar kendali langsung tindakan individu saat itu | Lantai licin, pencahayaan kurang, mesin tanpa pengaman, jalur evakuasi terhalang |

### 2.3 Data Kontribusi di Indonesia

Riset yang mengacu pada data BPJS Ketenagakerjaan dan literatur K3 nasional konsisten melaporkan pola serupa dengan temuan global Heinrich: sekitar **80–88% kecelakaan kerja** dikaitkan dengan tindakan tidak aman pekerja, sementara sisanya terkait kondisi tidak aman di lokasi kerja. Salah satu kajian bahkan merinci bahwa dari total penyebab kecelakaan, sekitar 34% terkait tindakan tidak aman secara umum dan sekitar 32% secara spesifik terkait ketidakpatuhan penggunaan Alat Pelindung Diri (APD).

---

## 3. Data & Konteks Kecelakaan Kerja di Indonesia

- Data BPJS Ketenagakerjaan mencatat tren peningkatan jumlah kasus kecelakaan kerja terlapor dalam beberapa tahun terakhir: sekitar 234 ribu kasus pada 2021, meningkat menjadi sekitar 298 ribu kasus pada 2022, dan tercatat lebih dari 315 ribu kasus pada 2023 (sebagian sumber lain menyebut angka mendekati 370 ribu kasus untuk tahun yang sama, tergantung metode pelaporan) — menegaskan tren kenaikan kasus kecelakaan kerja terlapor dari tahun ke tahun.
- Sektor konstruksi dan pertambangan tercatat sebagai penyumbang angka kecelakaan terbesar, diikuti sektor manufaktur dan minyak-gas — sektor-sektor ini memiliki karakteristik pekerjaan fisik berat yang mirip dengan konteks gudang/produksi.
- Kerugian ekonomi akibat kecelakaan kerja di Indonesia diperkirakan mencapai kisaran 4–6% dari Produk Domestik Bruto (PDB) nasional, menegaskan skala dampak isu ini bukan hanya pada level individu pekerja, tetapi juga pada level makroekonomi.
- Tingkat under-reporting diyakini masih tinggi, khususnya di sektor informal dan UMKM, yang berarti angka riil kemungkinan lebih tinggi dari data resmi yang tercatat.

**Implikasi bagi perancangan sistem:** karena mayoritas kecelakaan berakar dari perilaku (bukan semata kondisi fisik lokasi), sistem deteksi berbasis computer vision yang menyasar **perilaku pekerja secara real-time** berpotensi memberikan dampak pencegahan yang jauh lebih besar dibanding sistem yang hanya memantau kondisi statis lingkungan kerja.

---

## 4. Taksonomi Lengkap Perilaku Berbahaya di Lapangan

Berikut kategorisasi komprehensif perilaku/postur berbahaya yang relevan untuk lingkungan gudang, produksi, dan pekerjaan fisik berat — disusun berdasarkan jenis risiko cedera yang ditimbulkan:

| No | Kategori | Contoh Perilaku Spesifik | Jenis Risiko Cedera |
|---|---|---|---|
| 1 | **Postur Manual Handling** *(sudah dibahas di riset sebelumnya)* | Mengangkat dengan punggung membungkuk, twisting, overreaching | Musculoskeletal (LBP, HNP, strain otot) |
| 2 | **Gerakan Berbahaya/Locomotion** | Berlari di area kerja, meloncat dari ketinggian rendah (mis. dari atas pallet/truk), tergesa-gesa di lorong sempit atau tangga | Terpeleset/tersandung (slip, trip, fall), tabrakan dengan pekerja lain atau kendaraan |
| 3 | **Merokok & Perilaku Terkait Api/Panas** | Merokok di area terlarang, dekat bahan mudah terbakar (fuel storage, gudang kimia), atau di area ber-oksigen tinggi | Kebakaran, ledakan |
| 4 | **Ketidakpatuhan APD (PPE Non-Compliance)** | Tidak memakai helm, rompi keselamatan (safety vest), sarung tangan, kacamata pelindung, sepatu safety, atau pelindung telinga | Cedera kepala, mata, tangan, kaki; gangguan pendengaran |
| 5 | **Masuk Zona Terlarang/Berbahaya (Restricted Zone Entry)** | Memasuki area mesin aktif, area bertegangan tinggi, jalur forklift, area bawah beban tergantung (suspended load), tanpa otorisasi | Tertabrak, terjepit, tertimpa, tersengat listrik |
| 6 | **Interaksi Berisiko dengan Kendaraan/Alat Berat** | Berjalan terlalu dekat forklift/AGV, berada di titik buta (blind spot) operator, menyeberang jalur kendaraan tanpa memastikan keamanan | Tertabrak, terlindas |
| 7 | **Bekerja di Ketinggian Tanpa Proteksi** | Naik ke rak tinggi/scaffolding/tangga tanpa harness, tanpa 3 titik tumpu saat naik tangga, melewati pembatas (barricade) area tepi | Jatuh dari ketinggian (salah satu penyebab cedera fatal tertinggi di industri) |
| 8 | **Kelelahan & Microsleep (Fatigue)** | Tanda-tanda mengantuk saat mengoperasikan alat berat/forklift, kepala mengangguk, mata tertutup lama | Kecelakaan akibat penurunan kewaspadaan, human error |
| 9 | **Distraksi/Penggunaan Gadget** | Menggunakan ponsel sambil bekerja/mengoperasikan alat, sambil berjalan di area lalu lintas kendaraan | Kehilangan kewaspadaan situasional, kecelakaan akibat lengah |
| 10 | **Horseplay/Bercanda Berbahaya** | Bergulat, saling melempar barang, berkendara ugal-ugalan dengan forklift/hand truck untuk bersenang-senang | Cedera akibat benturan, jatuh, tertimpa |
| 11 | **Postur Statis Janggal Berkepanjangan** | Menahan posisi membungkuk/jongkok/menjangkau dalam waktu lama tanpa jeda (di luar konteks mengangkat) | Kelelahan otot kumulatif, MSD kronis |
| 12 | **Perilaku Terkait Housekeeping Berbahaya** | Meletakkan barang menghalangi jalur evakuasi/APAR, menumpuk barang melebihi tinggi aman, membiarkan tumpahan tanpa penanganan | Tersandung, tertimpa reruntuhan, terhambat evakuasi darurat |
| 13 | **Ketidakpatuhan Prosedur Lock-Out Tag-Out (LOTO)** | Bekerja pada mesin tanpa mematikan/mengunci sumber energi terlebih dahulu | Tersengat listrik, terjepit mesin bergerak tiba-tiba |
| 14 | **Berkerumun/Kepadatan Berlebih (Overcrowding)** | Terlalu banyak pekerja berkumpul di satu titik/zona kerja, menghalangi jalur evakuasi | Risiko cedera massal saat insiden, terhambatnya respons darurat |

> Kategori 1 (manual handling) telah dibahas mendalam pada dokumen riset sebelumnya. Dokumen ini berfokus pada kategori 2–14.

---

## 5. Pembahasan Mendalam per Kategori Perilaku

### 5.1 Berlari & Gerakan Tergesa-gesa di Area Kerja

**Risiko:** Berlari di lorong gudang, area produksi, atau dekat rak tinggi meningkatkan risiko slip-trip-fall, tabrakan dengan pekerja lain, forklift, atau rak barang. Permukaan lantai gudang seringkali licin (oli, air, debu) dan tidak dirancang untuk lalu lintas berkecepatan tinggi.

**Indikator visual untuk deteksi:** Kecepatan pergerakan titik pusat tubuh (centroid) antar-frame yang melebihi ambang batas kecepatan berjalan normal; pola gerakan kaki (gait) yang khas berlari (fase melayang/tidak ada kaki menyentuh lantai) berbeda dari berjalan.

**Pendekatan computer vision:** Ini termasuk kategori **action recognition/human activity recognition (HAR)** — mengklasifikasikan aksi (diam, berjalan, berlari, jatuh) dari sekuens video, umumnya menggunakan data skeleton (bukan RGB mentah) untuk efisiensi dan robustness terhadap variasi penampilan. Pendekatan berbasis skeleton memakai jarak, kecepatan (velocity), dan percepatan (acceleration) antar-titik keypoints sebagai fitur, karena fitur skeletal murni terkadang tidak cukup membedakan berlari vs berjalan tanpa mempertimbangkan laju perubahan koordinat (rate of change) dari waktu ke waktu. Arsitektur yang umum dipakai: CNN, RNN/LSTM, Graph Convolutional Network (GCN/ST-GCN) yang memodelkan skeleton sebagai graf spatio-temporal.

### 5.2 Merokok di Area Terlarang

**Risiko:** Gudang/pabrik sering menyimpan bahan mudah terbakar (kardus, plastik, bahan kimia, bahan bakar). Merokok di dekat area tersebut adalah salah satu penyebab kebakaran industri yang signifikan.

**Indikator visual:** Kehadiran objek kecil (rokok/puntung rokok) di dekat area mulut, disertai postur tangan-ke-mulut yang repetitif, dan/atau asap tipis di sekitar wajah.

**Pendekatan computer vision:** Deteksi rokok umumnya didekati sebagai **object detection** skala kecil menggunakan varian keluarga **YOLO** (YOLOv3 hingga versi terbaru), karena objek rokok berukuran kecil dan sering tertutup sebagian (occluded) oleh jari/tangan — tantangan utama riset di bidang ini. Riset terbaru mengembangkan model YOLO dengan modifikasi khusus untuk objek kecil dan sering-tertutup, termasuk sistem yang dirancang spesifik untuk area rawan seperti pintu darurat/fire exit zone, karena area tersebut kerap menjadi tempat merokok tersembunyi namun sangat berisiko tinggi akibat kedekatan dengan jalur evakuasi. Pendekatan pelengkap mencakup **klasifikasi citra** (smoker vs non-smoker) menggunakan CNN (mis. InceptionResNetV2, VGG16) berbasis pose tangan-mulut, serta deteksi asap (smoke detection) sebagai sinyal tambahan. Tantangan umum: false positive dari gestur serupa (menelepon, makan, uap/vapor rokok elektrik) serta kebutuhan frame rate tinggi (>15 FPS) untuk penerapan real-time.

### 5.3 Ketidakpatuhan Alat Pelindung Diri (APD/PPE)

**Risiko:** Ketiadaan APD adalah salah satu kontributor terbesar keparahan cedera — bukan penyebab kecelakaan itu sendiri, tetapi penentu utama seberapa parah dampaknya (mis. cedera kepala fatal vs ringan saat tertimpa benda, tergantung pemakaian helm).

**Indikator visual:** Ketiadaan/keberadaan objek spesifik pada area tubuh tertentu — helm di kepala, rompi reflektif di badan, sarung tangan di tangan, kacamata di wajah, sepatu safety di kaki.

**Pendekatan computer vision:** Merupakan salah satu use-case computer vision safety paling matang dan banyak dipakai secara komersial saat ini. Umumnya menggunakan **object detection** (keluarga YOLO, terutama YOLOv8 ke atas) yang dilatih untuk mengenali kelas-kelas APD secara langsung pada citra pekerja, dikombinasikan dengan deteksi orang untuk memetakan setiap item APD ke individu tertentu — penting di lingkungan padat pekerja agar setiap pelanggaran dapat diatribusikan ke orang yang benar. Sistem produksi umumnya berjalan pada edge device (mis. NVIDIA Jetson) untuk pemrosesan real-time tanpa latensi cloud, dan langsung memicu alert begitu pekerja terdeteksi memasuki zona wajib-APD tanpa kelengkapan yang sesuai.

### 5.4 Memasuki Zona Terlarang/Berbahaya

**Risiko:** Area seperti radius operasi mesin otomatis, area bertegangan tinggi, di bawah beban yang sedang diangkat crane, atau jalur eksklusif forklift, adalah zona di mana kehadiran manusia tanpa otorisasi/APD khusus sangat berbahaya.

**Indikator visual:** Posisi titik kaki/pusat tubuh seseorang berada di dalam poligon zona terlarang yang telah didefinisikan pada citra kamera (virtual fence/geofencing berbasis citra).

**Pendekatan computer vision:** Kombinasi **deteksi objek/orang** (mis. YOLO) dengan **definisi zona virtual** (polygon/bounding area yang digambar di atas frame kamera) — begitu titik referensi tubuh seseorang (biasanya titik tengah bawah bounding box, mendekati posisi kaki) masuk ke polygon tersebut, sistem memicu alert seketika. Sistem semacam ini banyak diimplementasikan sebagai modul umum di platform AI CCTV industri karena relatif straightforward namun berdampak besar terhadap pencegahan insiden.

### 5.5 Interaksi Berisiko dengan Kendaraan/Forklift

**Risiko:** Forklift dan kendaraan industri lain memiliki titik buta yang signifikan; kombinasi kebisingan gudang yang membuat pekerja sulit mendengar kendaraan mendekat, ditambah rute yang saling bersilangan di persimpangan lorong, menjadikan tabrakan forklift-pejalan kaki sebagai salah satu insiden fatal paling umum di gudang/pabrik.

**Indikator visual/sensor:** Jarak dan lintasan (trajectory) relatif antara kendaraan dan pejalan kaki; deteksi kedekatan pada persimpangan/blind spot; prediksi jalur potensi tabrakan (collision path prediction) dari pergerakan kedua pihak.

**Pendekatan deteksi:** Selain berbasis computer vision murni (kamera pada forklift atau CCTV area persimpangan yang mendeteksi pejalan kaki dan menganalisis lintasan pergerakan), banyak solusi industri komersial mengombinasikan atau bahkan menggantinya dengan sensor **Ultra-Wideband (UWB)** untuk deteksi jarak yang lebih presisi dan tidak terhalang oleh rak/pallet — karena sensor radio dapat "melihat tembus" objek yang menghalangi garis pandang kamera, sesuatu yang menjadi keterbatasan pendekatan vision-only di lorong gudang yang padat. Sistem menyeluruh biasanya memicu peringatan bertingkat: peringatan visual/suara pada zona kuning (waspada), dan otomatis mengurangi kecepatan/mengerem pada zona merah (bahaya).

### 5.6 Bekerja di Ketinggian Tanpa Proteksi

**Risiko:** Jatuh dari ketinggian adalah kontributor utama pada insiden fatal di berbagai riset dan laporan industri — dilaporkan menjadi faktor penyebab utama pada sebagian besar insiden jatuh fatal di sektor konstruksi dan industrial.

**Indikator visual:** Kehadiran pekerja pada area/struktur elevated (rak tinggi, scaffolding, atap, tangga) dikombinasikan dengan ketiadaan objek harness/lanyard yang terpasang dan terhubung ke titik jangkar (anchor point); untuk tangga, indikator tambahan mencakup sudut kemiringan tangga yang tidak wajar, ketiadaan stabilizer, atau pekerja yang tidak mempertahankan tiga titik kontak (three points of contact) saat naik/turun.

**Pendekatan computer vision:** Kombinasi deteksi objek (harness, lanyard, anchor point) berbasis YOLO dengan estimasi konteks ketinggian/struktur (platform, tangga, scaffolding) dari citra, serta pose estimation untuk memverifikasi postur naik-turun tangga yang aman. Riset akademik mengonfirmasi efektivitas pendekatan CNN (mis. Faster R-CNN dua-tahap) untuk memverifikasi keberadaan dan pemakaian harness pekerja yang bekerja di ketinggian sebagai bagian dari upaya behavior-based safety berbasis vision.

### 5.7 Kelelahan (Fatigue) & Microsleep

**Risiko:** Terutama krusial bagi operator forklift/alat berat — kewaspadaan yang menurun akibat kelelahan meningkatkan risiko kecelakaan secara signifikan, sebanding dengan risiko pada pengemudi kendaraan yang mengantuk di jalan raya.

**Indikator visual:** Metrik yang paling umum dipakai adalah:
- **Eye Aspect Ratio (EAR)** — rasio geometris dari titik-titik landmark di sekitar mata; nilainya relatif konstan saat mata terbuka dan menurun tajam saat mata tertutup.
- **PERCLOS (Percentage of Eyelid Closure)** — metrik yang menghitung persentase waktu mata tertutup secara perlahan (bukan kedipan normal), dianggap lebih representatif untuk fatigue dibanding sekadar frekuensi kedip.
- **Mouth Aspect Ratio (MAR)** — untuk mendeteksi menguap (yawning).
- **Head pose tracking** — mendeteksi kepala yang mengangguk/tertunduk sebagai indikasi microsleep.

**Pendekatan computer vision:** Deteksi wajah dan facial landmark (mis. menggunakan MediaPipe dengan ratusan titik landmark wajah, atau model landmark klasik seperti Dlib 68-titik) menjadi basis penghitungan EAR/MAR secara real-time, umumnya dikombinasikan dengan pelacakan pose kepala. Sistem produksi umumnya menetapkan ambang batas (threshold) EAR tertentu yang jika terlampaui secara berulang/berkelanjutan dalam durasi tertentu, memicu peringatan kelelahan.

### 5.8 Distraksi/Penggunaan Ponsel Saat Bekerja

**Risiko:** Distraksi mengurangi kewaspadaan situasional, terutama berbahaya saat berada di area lalu lintas kendaraan/mesin bergerak.

**Indikator visual:** Postur kepala menunduk ke arah tangan/objek kecil di depan wajah, disertai objek ponsel/gadget yang terdeteksi di tangan; durasi menatap ke bawah yang melebihi ambang wajar saat sedang berjalan atau berada di zona aktif.

**Pendekatan computer vision:** Kombinasi deteksi objek (ponsel/gadget di tangan) dengan analisis pose (posisi kepala-tangan) serta estimasi arah pandang (gaze estimation) bila resolusi kamera memungkinkan. Riset human-robot interaction menunjukkan bahwa indikator tunggal seperti hanya PERCLOS atau hanya frekuensi kedip cenderung memiliki akurasi terbatas untuk mendeteksi lapse perhatian pekerja secara umum (bukan hanya kelelahan), sehingga pendekatan **multimodal** — menggabungkan beberapa sinyal visual sekaligus — cenderung lebih andal dibanding mengandalkan satu metrik saja.

### 5.9 Horseplay / Bercanda Berbahaya

**Risiko:** Meskipun jarang dibahas eksplisit dalam sistem komersial, perilaku ini (saling dorong, berkejaran, mengendarai forklift secara ugal-ugalan untuk bersenang-senang) tetap menjadi penyebab cedera nyata di lapangan kerja fisik.

**Pendekatan computer vision:** Termasuk kategori sulit karena tumpang tindih secara visual dengan aktivitas kerja normal yang melibatkan gerakan cepat/kontak fisik (mis. mengangkat berdua). Pendekatan yang lebih realistis adalah **deteksi anomali perilaku (anomaly action recognition)** — memodelkan distribusi pola gerakan "normal" dari data observasi rutin, lalu menandai pola yang menyimpang signifikan (kecepatan gerak ekstrem, interaksi fisik antar-individu yang tidak lazim) sebagai potensi anomali untuk ditinjau manusia, bukan klasifikasi biner otomatis langsung. Riset zero-shot anomaly action recognition berbasis fitur skeleton pretrained relevan sebagai pendekatan lanjutan untuk kategori perilaku yang sulit didefinisikan sebagai kelas tetap.

### 5.10 Postur Statis Janggal Berkepanjangan (di luar konteks mengangkat)

**Risiko:** Menjangkau/menunduk/berjongkok dalam waktu lama saat pekerjaan non-lifting (mis. merakit di jalur produksi, memeriksa mesin di posisi rendah) tetap berkontribusi terhadap kelelahan otot kumulatif dan MSD kronis, meski mekanismenya berbeda dari cedera akut saat mengangkat.

**Pendekatan computer vision:** Sama seperti kerangka REBA/RULA yang dibahas di riset sebelumnya, namun dengan penekanan pada **durasi** (bukan hanya sudut sesaat) — sistem perlu melacak berapa lama seorang pekerja bertahan dalam postur berisiko sepanjang shift kerja, sebagai fitur temporal tambahan di luar deteksi sudut per-frame.

### 5.11 Housekeeping Berbahaya & Kepatuhan LOTO/Overcrowding

Kategori ini (13–14 pada tabel taksonomi) sering kali lebih dekat ke **unsafe condition** dibanding unsafe act murni, namun tetap relevan untuk sistem visual karena dapat dideteksi dari citra: barang menghalangi jalur evakuasi/APAR (object detection pada area yang seharusnya kosong), kepadatan pekerja berlebih di satu titik (people counting/density estimation), atau pekerja berada di dekat mesin yang seharusnya dalam status terkunci (LOTO) berdasarkan status sensor mesin — kategori terakhir ini biasanya memerlukan integrasi dengan sistem sensor/IoT mesin, bukan visual semata.

---

## 6. Ringkasan Teknologi Computer Vision per Kategori

| Kategori Perilaku | Pendekatan CV Utama | Model/Teknik Umum | Kebutuhan Tambahan |
|---|---|---|---|
| Berlari/gerakan tergesa | Action recognition (skeleton-based) | ST-GCN, LSTM, CNN atas fitur jarak/kecepatan/sudut | Data temporal (sequence, bukan 1 frame) |
| Merokok di area terlarang | Object detection (objek kecil) | YOLO (v3–v9+) khusus small-object | Anotasi objek rokok, penanganan oklusi |
| Ketidakpatuhan APD | Object detection multi-kelas | YOLOv8+ | Deteksi orang + asosiasi APD per-individu |
| Zona terlarang | Object detection + geofencing virtual | YOLO + polygon zone logic | Definisi manual zona per kamera |
| Interaksi forklift-pejalan kaki | Object detection + tracking + trajectory prediction | YOLO/tracking (mis. DeepSORT) ± sensor UWB pelengkap | Kalibrasi kamera, integrasi sensor jika hybrid |
| Bekerja di ketinggian | Object detection (harness/lanyard) + context/pose | Faster R-CNN, YOLOv8 | Deteksi struktur elevated, titik jangkar |
| Kelelahan/fatigue | Facial landmark + metrik geometris | EAR, PERCLOS, MAR, head pose | Kamera menghadap wajah (jarak dekat) |
| Distraksi/gadget | Object detection + pose + gaze | YOLO (ponsel) + pose estimation | Kombinasi multimodal untuk akurasi |
| Horseplay/anomali | Anomaly action recognition | Model skeleton pretrained + anomaly scoring | Data baseline "normal" yang representatif |
| Postur statis lama | Pose estimation + temporal duration tracking | REBA-like + timer per-individu | Tracking identitas individu antar-frame |
| Housekeeping/overcrowding | Object detection + density estimation | YOLO + people counting | Definisi area sensitif (jalur evakuasi, dsb.) |

---

## 7. Arsitektur Sistem Deteksi Multi-Perilaku (Terintegrasi)

Mengingat banyaknya kategori perilaku, arsitektur sistem yang scalable sebaiknya **modular** — satu backbone deteksi orang/pose bersama, dengan modul-modul klasifikasi/aturan spesifik per perilaku yang dapat diaktifkan/nonaktifkan sesuai kebutuhan lokasi:

```
1. Input multi-kamera (CCTV existing / edge camera)
        ↓
2. Backbone bersama:
   a) Person detector (YOLO) → bounding box & tracking ID per individu
   b) Pose estimator → skeleton keypoints per individu
   c) (Opsional) Face landmark detector → untuk modul fatigue/distraksi
        ↓
3. Feature extraction layer (dipakai lintas modul):
   - Posisi & kecepatan centroid
   - Sudut-sudut sendi (trunk, knee, neck, dst.)
   - Posisi relatif terhadap zona virtual yang telah didefinisikan
   - Objek yang terdeteksi di sekitar individu (APD, rokok, ponsel, harness)
        ↓
4. Modul-modul deteksi paralel (aktif/nonaktif sesuai konfigurasi lokasi):
   [Unsafe Lifting] [Berlari] [Merokok] [APD] [Zona Terlarang]
   [Proximity Kendaraan] [Ketinggian] [Fatigue] [Distraksi] [Housekeeping]
        ↓
5. Agregator alert & prioritas:
   - Deduplikasi (satu insiden tidak memicu banyak alert redundan)
   - Skoring tingkat urgensi (mis. zona terlarang + mesin aktif = urgensi tertinggi)
        ↓
6. Output: dashboard real-time, alert ke supervisor, log historis untuk audit K3
```

**Keuntungan pendekatan modular:** backbone deteksi orang & pose (langkah 2–3) hanya perlu dijalankan sekali per frame meski banyak modul aktif sekaligus, sehingga lebih efisien secara komputasi dibanding menjalankan model terpisah penuh untuk setiap jenis perilaku.

---

## 8. Matriks Prioritas Implementasi

Untuk membantu menentukan urutan pengembangan modul (karena membangun semua kategori sekaligus tidak realistis pada tahap awal), berikut matriks prioritas berdasarkan **tingkat keparahan potensial** vs **kompleksitas teknis implementasi**:

| Kategori | Keparahan Potensial | Kompleksitas Teknis | Prioritas Disarankan |
|---|---|---|---|
| Ketidakpatuhan APD | Tinggi | Rendah–Sedang (object detection matang) | **Sangat Tinggi** — quick win |
| Zona terlarang | Tinggi | Rendah–Sedang | **Sangat Tinggi** — quick win |
| Unsafe lifting | Sedang–Tinggi (kumulatif) | Sedang | **Tinggi** *(sudah dibahas terpisah)* |
| Interaksi forklift-pejalan kaki | Sangat Tinggi (fatal) | Sedang–Tinggi | **Tinggi** |
| Bekerja di ketinggian tanpa proteksi | Sangat Tinggi (fatal) | Sedang–Tinggi | **Tinggi** |
| Merokok di area terlarang | Tinggi (kebakaran/ledakan) | Sedang (objek kecil, oklusi) | **Sedang–Tinggi** |
| Berlari/gerakan tergesa | Sedang | Sedang (butuh temporal) | **Sedang** |
| Kelelahan/fatigue | Sedang–Tinggi (operator alat berat) | Sedang (perlu kamera wajah dekat) | **Sedang** |
| Distraksi/gadget | Sedang | Sedang–Tinggi (multimodal) | **Sedang** |
| Housekeeping/overcrowding | Rendah–Sedang | Rendah | **Sedang** |
| Horseplay/anomali | Rendah–Sedang (jarang tapi bisa parah) | Tinggi (anomaly detection) | **Rendah (fase lanjut)** |
| Postur statis lama | Rendah (efek kumulatif jangka panjang) | Sedang (butuh tracking durasi) | **Rendah (fase lanjut)** |

*(Catatan: prioritas ini bersifat indikatif umum; sebaiknya disesuaikan kembali dengan profil risiko aktual lokasi kerja target — mis. gudang bahan kimia akan menaikkan prioritas modul merokok, sementara gudang dengan banyak rak tinggi akan menaikkan prioritas modul ketinggian.)*

---

## 9. Tantangan Teknis & Etis

| Tantangan | Penjelasan | Mitigasi |
|---|---|---|
| **Privasi pekerja** | Pemantauan perilaku terus-menerus dapat menimbulkan keberatan privasi/kepercayaan pekerja | Anonymisasi (blur wajah pada rekaman tersimpan), komunikasi transparan tujuan sistem, kebijakan retensi data yang jelas |
| **False positive/negative lintas-modul** | Setiap modul berpotensi salah deteksi (mis. gestur makan terdeteksi sebagai merokok) | Validasi lapangan bertahap, human-in-the-loop review sebelum tindakan disipliner, kalibrasi threshold per lokasi |
| **Beban komputasi multi-modul** | Menjalankan banyak model deteksi sekaligus pada CCTV existing bisa berat | Arsitektur backbone bersama (lihat Bagian 7), deployment edge, optimasi model (quantization, pruning) |
| **Budaya "blame" vs "just culture"** | Sistem deteksi yang dipakai untuk menghukum (bukan mencegah) dapat menurunkan kepercayaan dan justru mendorong pekerja menyembunyikan insiden | Posisikan sistem sebagai alat coaching/pencegahan, bukan pengawasan punitif; integrasikan dengan program BBS yang berbasis feedback positif |
| **Variasi kondisi lapangan** | Pencahayaan, sudut kamera, oklusi oleh rak/pallet sangat bervariasi antar lokasi | Dataset pelatihan yang representatif dari lokasi target, multi-kamera untuk mengurangi blind spot |
| **Ambiguitas definisi perilaku** | Beberapa perilaku (mis. horseplay) sulit didefinisikan secara pasti/biner | Pendekatan anomaly detection dengan human review, bukan klasifikasi otomatis penuh untuk kategori ambigu |
| **Integrasi lintas sistem** | Beberapa modul (LOTO, forklift proximity presisi tinggi) idealnya butuh data non-visual (sensor mesin, UWB) | Rancang sistem sebagai platform hybrid vision + IoT/sensor sejak awal, bukan vision-only yang kaku |

---

## 10. Kesimpulan & Rekomendasi

1. **Unsafe lifting adalah satu dari banyak kategori unsafe act** — untuk dampak maksimal terhadap penurunan angka kecelakaan kerja (mengacu Heinrich's Law bahwa ~80-88% kecelakaan berakar dari perilaku), sistem idealnya dirancang sebagai platform yang dapat diperluas mencakup kategori lain secara bertahap, bukan sistem tunggal yang hanya menyasar satu jenis postur.
2. **APD dan zona terlarang adalah titik awal paling praktis** — keduanya memiliki teknologi computer vision paling matang (object detection standar), risiko keparahan tinggi, dan kompleksitas implementasi relatif rendah dibanding kategori lain seperti fatigue atau anomaly behavior.
3. **Backbone deteksi-orang dan pose-estimation bersama** adalah kunci efisiensi — banyak kategori (lifting, berlari, postur statis, zona terlarang) dapat memanfaatkan output skeleton/bounding-box yang sama, sehingga membangunnya sebagai layer bersama sejak awal akan menghemat biaya komputasi signifikan saat sistem berkembang mencakup lebih banyak modul.
4. **Beberapa kategori butuh sensor pelengkap non-visual** (terutama proximity forklift-pejalan kaki presisi tinggi dan status LOTO mesin) — jangan memaksakan pendekatan vision-only untuk kasus yang secara inheren lebih andal ditangani sensor radio/IoT.
5. **Aspek non-teknis sama pentingnya dengan aspek teknis** — sistem deteksi perilaku yang tidak dikomunikasikan dengan baik ke pekerja berisiko menimbulkan resistensi budaya (blame culture), yang justru bisa kontraproduktif terhadap tujuan keselamatan itu sendiri. Pendekatan "just culture" dan integrasi dengan program Behavior-Based Safety (BBS) yang sudah ada di perusahaan sangat disarankan.

**Langkah lanjutan yang disarankan:**
- Lakukan risk assessment/pemetaan bahaya spesifik di lokasi kerja target untuk menentukan kombinasi modul prioritas (merujuk matriks Bagian 8, disesuaikan konteks lokal).
- Rancang skema data & anotasi yang selaras dengan taksonomi pada Bagian 4, sehingga dataset yang dikumpulkan dapat dipakai lintas beberapa modul sekaligus (mis. video area gudang bisa dipakai untuk anotasi lifting, berlari, dan APD sekaligus).
- Tentukan modul mana yang akan berbasis vision murni vs hybrid vision+sensor, khususnya untuk kategori forklift proximity dan LOTO.
- Susun kebijakan privasi dan komunikasi internal sebelum go-live, agar penerimaan pekerja terhadap sistem lebih baik sejak awal.

---

## 11. Referensi

1. EHS Insight — *Understanding the Safety Pyramid*. https://www.ehsinsight.com/blog/understanding-the-safety-pyramid
2. Wikipedia — *Herbert William Heinrich*. https://en.wikipedia.org/wiki/Herbert_William_Heinrich
3. Safety+Health Magazine (NSC) — *Examining the Foundation: Were Heinrich's Theories Valid?*. https://www.safetyandhealthmagazine.com/articles/6368-examining-the-foundation
4. OSHA Community — *The Heinrich's Safety Triangle: Understanding Workplace Risks*. https://oshacommunity.com/osha/heinrichs-safety-triangle/
5. AutoStore System — *What is Heinrich's Law?*. https://www.autostoresystem.com/insights/what-is-heinrichs-law
6. viAct.ai — *How AI Detects and Prevents Unsafe Behaviors in the Workplace*. https://www.viact.ai/post/how-ai-detects-and-prevents-unsafe-behaviors-in-the-workplace
7. OxMaint — *AI PPE Detection & Workplace Safety Monitoring*. https://www.oxmaint.com/blog/post/ai-ppe-detection-workplace-safety-monitoring
8. viAct.ai — *PPE Detection: AI Video Analytics PPE Monitoring*. https://www.viact.ai/ppedetection
9. Silent Infotech — *Industrial Safety Monitoring with Computer Vision*. https://silentinfotech.com/blog/technology-solution-14/industrial-safety-monitoring-computer-vision-561
10. Nava Software — *AI for Workplace Safety: From Checklists to Prevention*. https://navasoftware.com/insights/blog/ai-for-workplace-safety/
11. RioDatos — *11 CCTV AI Safety Platforms That Turn Cameras Into EHS Workplace Safety Systems*. https://www.riodatos.com/post/11-cctv-ai-safety-platforms-that-turn-cameras-into-workplace-safety-systems
12. Springer — *Skeleton-based human activity recognition using ConvLSTM and guided feature learning*. https://link.springer.com/article/10.1007/s00500-021-06238-7
13. arXiv (2303.15167) — *Prompt-Guided Zero-Shot Anomaly Action Recognition using Pretrained Deep Skeleton Features*. https://arxiv.org/pdf/2303.15167
14. IJRASET — *Real Time Cigarette Detection using Deep Learning Models*. https://www.ijraset.com/research-paper/real-time-cigarette-detection-using-deep-learning-models
15. ScienceDirect — *Deep learning-based smoker classification and detection: An overview and evaluation*. https://www.sciencedirect.com/science/article/abs/pii/S0957417424030756
16. Frontiers — *Smoking behavior detection algorithm based on YOLOv8-MNC*. https://www.frontiersin.org/journals/computational-neuroscience/articles/10.3389/fncom.2023.1243779/full
17. arXiv (2508.11696) — *A Deep Learning-Based CCTV System for Automatic Smoking Detection in Fire Exit Zones*. https://arxiv.org/html/2508.11696v1
18. ResearchGate — *Falls from Heights: A Computer Vision-based Approach for Safety Harness Detection*. https://www.researchgate.net/publication/322398183_Falls_from_Heights_A_Computer_Vision-based_Approach_for_Safety_Harness_Detection
19. ScienceDirect — *Falls from heights: A computer vision-based approach for safety harness detection*. https://www.sciencedirect.com/science/article/abs/pii/S0926580517308403
20. viso.ai — *Enhance Safety with Real-Time Work-at-Height Detection*. https://viso.ai/applications/work-at-height-detection/
21. iFactory — *AI Vision Fall Protection & Working-at-Height Monitoring*. https://ifactoryapp.com/ai-vision-camera/ai-vision-fall-protection-height-safety
22. Powerfleet (Fleet Complete) — *Forklift AI-Powered Pedestrian Proximity Detection System*. https://www.fleetcomplete.com/products/forklift-telematics/features/pedestrian-proximity-detection/
23. ELOKON — *ELOshield: Forklift Pedestrian Detection System*. https://www.elokon.com/en-US/material-handling/eloshield-vehicle-pedestrian-proximity-detection
24. iFactory — *Vehicle and Forklift Proximity Warning with AI Vision*. https://ifactoryapp.com/ai-vision-camera/vehicle-forklift-proximity-warning-ai-vision
25. RS Web Solutions — *Fatigue Detection Software: Boost Safety with AI Monitoring*. https://www.rswebsols.com/fatigue-detection-software/
26. ScienceDirect/PMC — *Computer vision-based approach to detect fatigue driving and face mask for edge computing device*. https://www.sciencedirect.com/science/article/pii/S2405844022024926 ; https://pmc.ncbi.nlm.nih.gov/articles/PMC9619001/
27. PMC — *Real-Time Fatigue Detection Algorithms Using Machine Learning for Yawning and Eye State*. https://pmc.ncbi.nlm.nih.gov/articles/PMC11644966/
28. arXiv (2604.22479) — *Improving Driver Drowsiness Detection via Personalized EAR/MAR Thresholds and CNN-Based Classification*. https://arxiv.org/pdf/2604.22479
29. arXiv (2304.10588) — *Detecting Worker Attention Lapses in Human-Robot Interaction: An Eye Tracking and Multimodal Sensing Study*. https://arxiv.org/pdf/2304.10588
30. Jurnal FKM UMI — *Faktor yang Berhubungan dengan Tindakan Tidak Aman (Unsafe Action)*. https://jurnal.fkm.umi.ac.id/index.php/woph/article/download/564/362/7529
31. Eprints UMG — *Pengaruh Unsafe Action terhadap Kecelakaan Kerja*. http://eprints.umg.ac.id/14488/1/1.%20Jurnal%20Artikel%20DESY%20211102021.pdf
32. Jurnal UMJ (EOHSJ) — *Environmental Occupational Health and Safety Journal*. https://jurnal.umj.ac.id/index.php/EOHSJ/article/download/12160/6889
33. Jurnal Unismuh Palu (JKS) — *Analisis Kesadaran dan Perilaku Keselamatan*. https://jurnal.unismuhpalu.ac.id/index.php/JKS/article/download/8460/5882/
34. Public Health and Safety International Journal — *Hubungan Unsafe Action dan Unsafe Condition Terhadap Kecelakaan Kerja*. https://mand-ycmm.org/index.php/phasij/article/view/1103
35. Indonesia Safety Center — *Kecelakaan Kerja di Indonesia: Data, Penyebab, dan Upaya Pencegahan*. https://indonesiasafetycenter.org/kecelakaan-kerja-di-indonesia-data-penyebab-dan-upaya-pencegahan/
36. AKUALITA — *Konsep Behavior Based Safety (BBS): Tahap Penerapan di Perusahaan*. https://akualita.com/news/penerapan-konsep-behavior-based-safety-bbs-perusahaan/
37. AKUALITA — *Unsafe Action dan Unsafe Condition: Penyebab Utama Kecelakaan Kerja*. https://akualita.com/news/unsafe-action-dan-unsafe-condition/

---

*Dokumen ini melengkapi `riset_unsafe_lifting_ergonomi.md`. Bersama-sama, kedua dokumen ini membentuk basis pengetahuan awal untuk merancang platform deteksi perilaku tidak aman (unsafe act detection) berbasis computer vision yang komprehensif di lingkungan kerja berat. Threshold, prioritas modul, dan pendekatan teknis pada dokumen ini bersifat titik awal dan perlu divalidasi dengan risk assessment aktual serta masukan tim K3 di lokasi kerja target.*
