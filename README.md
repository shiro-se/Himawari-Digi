# Himawari Digital

🌎 [English](#english) | 🇮🇩 [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## 🌎 English

Himawari Digital is a modern, single-page application (SPA) web development agency website built with vanilla JavaScript and Tailwind CSS v4. It features smooth animations, scroll-triggered reveals, and a dynamic, interactive layout.

### Features
- **Modern Single-Page Architecture**: Fast navigation without full page reloads using a custom Vanilla JS router.
- **Smooth Animations**: All pages feature premium scroll-triggered animations and hover effects.
- **Interactive Layouts**: Custom interactive elements like infinite carousels and 3D scrolling cards for maximum engagement.
- **Responsive Design**: Fully adaptive layouts strictly adhering to responsive design principles for Desktop, Tablet, and Mobile devices.
- **Dark Mode**: Built-in support for system-wide and manual theme toggling.

### Getting Started

#### Prerequisites
- A modern web browser.
- [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/) (required to compile the Tailwind CSS or easily spin up a local dev server).

#### Running Locally (To View the Site)
Since this is a client-side SPA that dynamically fetches its internal pages, **it must be run on a local web server**. Opening the `index.html` file directly in a browser via the `file://` protocol will result in CORS errors and the navigation will not work.

**Option 1: Using Node.js (Recommended)**
1. Open your terminal in the project directory.
2. Run: `npx serve` or `npx http-server`
3. Open `http://localhost:3000` (or the port provided in your terminal) in your browser.

**Option 2: Using VS Code Live Server**
1. Open the project folder in Visual Studio Code.
2. Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ms-vscode.live-server) extension.
3. Right-click the `index.html` file in the explorer and select **"Open with Live Server"**.

#### Compiling CSS (For Development)
This project uses Tailwind CSS v4. If you want to modify any of the HTML classes or the `style.css` file, you need to compile the output CSS:
1. Install the required Node dependencies: `npm install`
2. Run the build watcher during active development: `npm run watch:css`
3. To manually trigger a production build, run: `npm run build:css`

---

<a name="bahasa-indonesia"></a>
## 🇮🇩 Bahasa Indonesia

Himawari Digital adalah website agensi pengembangan web *single-page application* (SPA) modern yang dibangun menggunakan Vanilla JavaScript dan Tailwind CSS v4. Website ini dilengkapi dengan animasi yang halus, efek kemunculan elemen saat layar di-*scroll*, serta tata letak (*layout*) interaktif dan dinamis.

### Fitur Utama
- **Arsitektur Single-Page Modern**: Navigasi perpindahan halaman yang sangat cepat tanpa proses *reload* menggunakan *router* Vanilla JS khusus.
- **Animasi Premium**: Seluruh halaman dibekali dengan animasi premium yang dipicu oleh interaksi pengguna dan interaksi elemen *hover*.
- **Layout Interaktif**: Pemanfaatan *Infinite Carousel* dan *3D Scrolling Card* untuk memaksimalkan kepuasan pengalaman pengguna (UI/UX).
- **Desain Responsif**: Tampilan yang menyesuaikan secara otomatis dan presisi untuk layar Desktop, Tablet, hingga perangkat *Mobile* (HP).
- **Dark Mode**: Mendukung mode gelap (*Dark Mode*) baik secara manual lewat tombol bawaan, maupun mengikuti setelan bawaan dari sistem operasi pengguna.

### Panduan Memulai

#### Persyaratan Sistem
- Web browser modern.
- [Node.js](https://nodejs.org/) dan [npm](https://www.npmjs.com/) (dibutuhkan untuk kompilasi desain Tailwind CSS atau menjalankan *local web server* dengan mudah).

#### Menjalankan di Komputer Lokal (Localhost)
Karena website ini merupakan *Client-Side SPA* yang mengambil halaman secara dinamis lewat kode JavaScript, maka website ini **wajib dijalankan menggunakan *local web server***. 
(Peringatan: Jika Anda hanya sekadar meng-klik ganda file `index.html` sehingga terbuka melalui `file:///`, navigasinya tidak akan berjalan akibat error CORS dari bawaan pengamanan browser).

**Opsi 1: Menggunakan Node.js (Sangat Disarankan)**
1. Buka *terminal / command prompt* lalu arahkan letak folder ke folder proyek ini.
2. Jalankan perintah: `npx serve` atau `npx http-server`
3. Buka alamat `http://localhost:3000` (atau alamat *port* yang tertera di terminal Anda) melalui *browser*.

**Opsi 2: Menggunakan Live Server di VS Code**
1. Buka folder proyek ini menggunakan editor Visual Studio Code.
2. Pasang ekstensi (extension) [Live Server](https://marketplace.visualstudio.com/items?itemName=ms-vscode.live-server) jika belum ada.
3. Klik kanan pada file `index.html`, lalu pilih opsi **"Open with Live Server"**.

#### Mengkompilasi CSS (Untuk Proses Development)
Proyek ini ditenagai oleh Tailwind CSS v4. Jika Anda ingin melakukan perubahan pada tampilan (menambahkan kelas pada HTML atau mengubah di file `style.css`), Anda wajib menjalankan *compiler*:
1. Pasang semua paket instalasi terlebih dahulu: `npm install`
2. Jalankan *watcher* agar CSS langsung di-*update* otomatis secara real-time saat melakukan koding: `npm run watch:css`
3. Untuk proses kompilasi satu kali kerja (*production build*), jalankan perintah: `npm run build:css`