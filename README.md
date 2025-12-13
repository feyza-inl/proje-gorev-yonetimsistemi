# PGYS - Proje Görev Yönetim Sistemi

Bu proje, **Veritabanı Yönetim Sistemleri** dersi kapsamında geliştirilmiş; projelerin, görevlerin ve ekiplerin tek bir platform üzerinden yönetilmesini sağlayan web tabanlı bir uygulamadır.

Kullanıcılar projeler oluşturabilir, bu projelere görevler atayabilir, görev durumlarını (Yeni, Devam Ediyor, Tamamlandı vb.) takip edebilir ve ekip üyeleriyle işbirliği yapabilirler.

## 🛠️ Teknolojiler

Bu proje aşağıdaki teknolojiler kullanılarak geliştirilmiştir:

* **Frontend:** HTML5, CSS3 (Modern UI/UX), JavaScript (ES6+)
* **Backend:** Python (Flask Framework)
* **Veritabanı:** Microsoft SQL Server (MSSQL)
* **API:** RESTful API mimarisi
* **Kütüphaneler:** `flask`, `flask-cors`, `pyodbc`

## 📂 Proje Yapısı

```text
proje-gorev-yonetimsistemi/
├── backend/                # Python Flask API kodları
│   ├── app.py             # Ana sunucu dosyası
│   └── ...
├── frontend/               # Arayüz dosyaları
│   ├── index.html         # Ana sayfa (Giriş/Kayıt/Dashboard)
│   ├── profile.html       # Profil yönetimi sayfası
│   ├── styles.css         # Stil dosyaları
│   ├── app.js             # Ana JavaScript mantığı
│   └── profile.js         # Profil sayfası mantığı
├── requirements.txt        # Gerekli Python kütüphaneleri
└── README.md               # Proje dokümantasyonu