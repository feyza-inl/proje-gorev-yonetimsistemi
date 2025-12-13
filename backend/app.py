"""
PGYS - Proje Görev Yönetim Sistemi
Flask Backend API
SQL Server Veritabanı Bağlantısı
KULLANICI BAZLI VERİ FİLTRELEME İLE GÜNCELLENMİŞ
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pyodbc
from datetime import datetime
import hashlib

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests

# ========================================
# Database Configuration
# ========================================

DB_CONFIG = {
    'server': 'localhost\\SQLEXPRESS',  #kendı server bılgınızı gıreceksınız
    'database': 'PYTS',
    'driver': '{ODBC Driver 17 for SQL Server}'
}


def get_db_connection():
    """Veritabanı bağlantısı oluşturur"""
    try:
        conn_str = (
            f"DRIVER={DB_CONFIG['driver']};"
            f"SERVER={DB_CONFIG['server']};"
            f"DATABASE={DB_CONFIG['database']};"
            f"Trusted_Connection=yes;"
        )
        conn = pyodbc.connect(conn_str, timeout=10)
        return conn
    except Exception as e:
        print(f"❌ Veritabanı bağlantı hatası: {str(e)}")
        return None


# ========================================
# Utility Functions
# ========================================

def hash_password(password):
    """Şifreyi hash'ler"""
    return hashlib.sha256(password.encode()).hexdigest()


def format_date(date):
    """Tarihi formatlar"""
    if isinstance(date, datetime):
        return date.strftime('%Y-%m-%d')
    return date


# ========================================
# KULLANICILAR Endpoints
# ========================================

@app.route('/api/kullanicilar', methods=['GET'])
def get_kullanicilar():
    """Tüm kullanıcıları listeler"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Veritabanı bağlantısı kurulamadı'}), 500

        cursor = conn.cursor()
        cursor.execute("""
            SELECT k.KullaniciID, k.Ad, k.Soyad, k.Eposta, r.RolAdi
            FROM KULLANICILAR k
            LEFT JOIN PROJE_UYE_ILISKISI pui ON k.KullaniciID = pui.KullaniciID
            LEFT JOIN ROLLER r ON pui.RolID = r.RolID
        """)

        kullanicilar = []
        for row in cursor.fetchall():
            kullanicilar.append({
                'KullaniciID': row.KullaniciID,
                'Ad': row.Ad,
                'Soyad': row.Soyad,
                'Eposta': row.Eposta,
                'Rol': row.RolAdi if row.RolAdi else 'Ekip Üyesi'
            })

        conn.close()
        return jsonify(kullanicilar)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/kullanicilar/<int:id>', methods=['GET'])
def get_kullanici(id):
    """Belirli bir kullanıcıyı getirir"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Veritabanı bağlantısı kurulamadı'}), 500

        cursor = conn.cursor()
        cursor.execute("""
            SELECT KullaniciID, Ad, Soyad, Eposta
            FROM KULLANICILAR
            WHERE KullaniciID = ?
        """, (id,))

        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Kullanıcı bulunamadı'}), 404

        kullanici = {
            'KullaniciID': row.KullaniciID,
            'Ad': row.Ad,
            'Soyad': row.Soyad,
            'Eposta': row.Eposta
        }

        conn.close()
        return jsonify(kullanici)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/kullanicilar', methods=['POST'])
def create_kullanici():
    """Yeni kullanıcı oluşturur"""
    try:
        data = request.json
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Veritabanı bağlantısı kurulamadı'}), 500

        cursor = conn.cursor()

        # E-posta kontrolü
        cursor.execute("SELECT KullaniciID FROM KULLANICILAR WHERE Eposta = ?", (data['Eposta'],))
        if cursor.fetchone():
            return jsonify({'error': 'Bu e-posta zaten kullanılıyor'}), 400

        # Şifreyi hash'le
        sifre_hash = hash_password(data['SifreHash'])

        cursor.execute("""
            INSERT INTO KULLANICILAR (Ad, Soyad, Eposta, SifreHash)
            VALUES (?, ?, ?, ?)
        """, (data['Ad'], data['Soyad'], data['Eposta'], sifre_hash))

        conn.commit()

        # Yeni oluşturulan kullanıcının ID'sini al
        cursor.execute("SELECT @@IDENTITY")
        new_id = cursor.fetchone()[0]

        conn.close()
        return jsonify({'message': 'Kullanıcı oluşturuldu', 'KullaniciID': new_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/kullanicilar/<int:id>', methods=['PUT'])
def update_kullanici(id):
    """Kullanıcı bilgilerini günceller"""
    try:
        data = request.json
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Veritabanı bağlantısı kurulamadı'}), 500

        cursor = conn.cursor()
        cursor.execute("""
            UPDATE KULLANICILAR
            SET Ad = ?, Soyad = ?, Eposta = ?
            WHERE KullaniciID = ?
        """, (data['Ad'], data['Soyad'], data['Eposta'], id))

        conn.commit()
        conn.close()
        return jsonify({'message': 'Kullanıcı güncellendi'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/kullanicilar/<int:id>', methods=['DELETE'])
def delete_kullanici(id):
    """Kullanıcı siler"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Veritabanı bağlantısı kurulamadı'}), 500

        cursor = conn.cursor()
        cursor.execute("DELETE FROM KULLANICILAR WHERE KullaniciID = ?", (id,))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Kullanıcı silindi'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ========================================
# PROJELER Endpoints - KULLANICI BAZLI
# ========================================

@app.route('/api/projeler', methods=['GET'])
def get_projeler():
    """Tüm projeleri listeler (YÖNETİCİ) veya kullanıcının projelerini (NORMAL KULLANICI)"""
    try:
        # Kullanıcı ID'sini query parametresinden al
        kullanici_id = request.args.get('kullanici_id', type=int)

        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Veritabanı bağlantısı kurulamadı'}), 500

        cursor = conn.cursor()

        if kullanici_id:
            # Kullanıcının dahil olduğu projeler + yönettiği projeler
            cursor.execute("""
                SELECT DISTINCT p.ProjeID, p.ProjeAdi, p.BaslangicTarihi, p.BitisTarihi, 
                       p.Butce, p.YoneticiID, k.Ad as YoneticiAd, k.Soyad as YoneticiSoyad
                FROM PROJELER p
                LEFT JOIN KULLANICILAR k ON p.YoneticiID = k.KullaniciID
                LEFT JOIN PROJE_UYE_ILISKISI pui ON p.ProjeID = pui.ProjeID
                WHERE p.YoneticiID = ? OR pui.KullaniciID = ?
                ORDER BY p.BaslangicTarihi DESC
            """, (kullanici_id, kullanici_id))
        else:
            # Tüm projeler (admin görünümü)
            cursor.execute("""
                SELECT p.ProjeID, p.ProjeAdi, p.BaslangicTarihi, p.BitisTarihi, 
                       p.Butce, p.YoneticiID, k.Ad as YoneticiAd, k.Soyad as YoneticiSoyad
                FROM PROJELER p
                LEFT JOIN KULLANICILAR k ON p.YoneticiID = k.KullaniciID
                ORDER BY p.BaslangicTarihi DESC
            """)

        projeler = []
        for row in cursor.fetchall():
            projeler.append({
                'ProjeID': row.ProjeID,
                'ProjeAdi': row.ProjeAdi,
                'BaslangicTarihi': format_date(row.BaslangicTarihi),
                'BitisTarihi': format_date(row.BitisTarihi) if row.BitisTarihi else None,
                'Butce': float(row.Butce) if row.Butce else None,
                'YoneticiID': row.YoneticiID,
                'YoneticiAd': row.YoneticiAd if row.YoneticiAd else '',
                'YoneticiSoyad': row.YoneticiSoyad if row.YoneticiSoyad else ''
            })

        conn.close()
        return jsonify(projeler)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/projeler/<int:id>', methods=['GET'])
def get_proje(id):
    """Belirli bir projeyi getirir"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Veritabanı bağlantısı kurulamadı'}), 500

        cursor = conn.cursor()
        cursor.execute("""
            SELECT p.ProjeID, p.ProjeAdi, p.BaslangicTarihi, p.BitisTarihi, 
                   p.Butce, p.YoneticiID, k.Ad as YoneticiAd, k.Soyad as YoneticiSoyad
            FROM PROJELER p
            LEFT JOIN KULLANICILAR k ON p.YoneticiID = k.KullaniciID
            WHERE p.ProjeID = ?
        """, (id,))

        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Proje bulunamadı'}), 404

        proje = {
            'ProjeID': row.ProjeID,
            'ProjeAdi': row.ProjeAdi,
            'BaslangicTarihi': format_date(row.BaslangicTarihi),
            'BitisTarihi': format_date(row.BitisTarihi) if row.BitisTarihi else None,
            'Butce': float(row.Butce) if row.Butce else None,
            'YoneticiID': row.YoneticiID,
            'YoneticiAd': row.YoneticiAd if row.YoneticiAd else '',
            'YoneticiSoyad': row.YoneticiSoyad if row.YoneticiSoyad else ''
        }

        conn.close()
        return jsonify(proje)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/projeler', methods=['POST'])
def create_proje():
    """Yeni proje oluşturur"""
    try:
        data = request.json
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Veritabanı bağlantısı kurulamadı'}), 500

        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO PROJELER (ProjeAdi, BaslangicTarihi, BitisTarihi, Butce, YoneticiID)
            VALUES (?, ?, ?, ?, ?)
        """, (
            data['ProjeAdi'],
            data['BaslangicTarihi'],
            data.get('BitisTarihi'),
            data.get('Butce'),
            data.get('YoneticiID')
        ))

        conn.commit()

        cursor.execute("SELECT @@IDENTITY")
        new_id = cursor.fetchone()[0]

        conn.close()
        return jsonify({'message': 'Proje oluşturuldu', 'ProjeID': new_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/projeler/<int:id>', methods=['PUT'])
def update_proje(id):
    """Proje bilgilerini günceller"""
    try:
        data = request.json
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Veritabanı bağlantısı kurulamadı'}), 500

        cursor = conn.cursor()
        cursor.execute("""
            UPDATE PROJELER
            SET ProjeAdi = ?, BaslangicTarihi = ?, BitisTarihi = ?, Butce = ?, YoneticiID = ?
            WHERE ProjeID = ?
        """, (
            data['ProjeAdi'],
            data['BaslangicTarihi'],
            data.get('BitisTarihi'),
            data.get('Butce'),
            data.get('YoneticiID'),
            id
        ))

        conn.commit()
        conn.close()
        return jsonify({'message': 'Proje güncellendi'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/projeler/<int:id>', methods=['DELETE'])
def delete_proje(id):
    """Proje siler"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Veritabanı bağlantısı kurulamadı'}), 500

        cursor = conn.cursor()
        cursor.execute("DELETE FROM PROJELER WHERE ProjeID = ?", (id,))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Proje silindi'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ========================================
# GOREVLER Endpoints - KULLANICI BAZLI
# ========================================

@app.route('/api/gorevler', methods=['GET'])
def get_gorevler():
    """Kullanıcının görevlerini listeler"""
    try:
        # Kullanıcı ID'sini query parametresinden al
        kullanici_id = request.args.get('kullanici_id', type=int)

        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Veritabanı bağlantısı kurulamadı'}), 500

        cursor = conn.cursor()

        if kullanici_id:
            # Kullanıcıya atanmış görevler + kullanıcının projelerindeki görevler
            cursor.execute("""
                SELECT DISTINCT g.GorevID, g.GorevAdi, g.Aciklama, g.TeslimTarihi,
                       g.ProjeID, p.ProjeAdi,
                       g.DurumID, d.DurumAdi,
                       g.OncelikID, o.OncelikAdi
                FROM GOREVLER g
                LEFT JOIN PROJELER p ON g.ProjeID = p.ProjeID
                LEFT JOIN DURUMLAR d ON g.DurumID = d.DurumID
                LEFT JOIN ONCELIKLER o ON g.OncelikID = o.OncelikID
                LEFT JOIN GOREV_ATAMALARI ga ON g.GorevID = ga.GorevID
                LEFT JOIN PROJE_UYE_ILISKISI pui ON g.ProjeID = pui.ProjeID
                WHERE ga.KullaniciID = ? OR pui.KullaniciID = ? OR p.YoneticiID = ?
                ORDER BY g.TeslimTarihi ASC
            """, (kullanici_id, kullanici_id, kullanici_id))
        else:
            # Tüm görevler (admin görünümü)
            cursor.execute("""
                SELECT g.GorevID, g.GorevAdi, g.Aciklama, g.TeslimTarihi,
                       g.ProjeID, p.ProjeAdi,
                       g.DurumID, d.DurumAdi,
                       g.OncelikID, o.OncelikAdi
                FROM GOREVLER g
                LEFT JOIN PROJELER p ON g.ProjeID = p.ProjeID
                LEFT JOIN DURUMLAR d ON g.DurumID = d.DurumID
                LEFT JOIN ONCELIKLER o ON g.OncelikID = o.OncelikID
                ORDER BY g.TeslimTarihi ASC
            """)

        gorevler = []
        for row in cursor.fetchall():
            gorevler.append({
                'GorevID': row.GorevID,
                'GorevAdi': row.GorevAdi,
                'Aciklama': row.Aciklama,
                'TeslimTarihi': format_date(row.TeslimTarihi),
                'ProjeID': row.ProjeID,
                'ProjeAdi': row.ProjeAdi if row.ProjeAdi else '',
                'DurumID': row.DurumID,
                'DurumAdi': row.DurumAdi if row.DurumAdi else '',
                'OncelikID': row.OncelikID,
                'OncelikAdi': row.OncelikAdi if row.OncelikAdi else ''
            })

        conn.close()
        return jsonify(gorevler)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/gorevler/<int:id>', methods=['GET'])
def get_gorev(id):
    """Belirli bir görevi getirir"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Veritabanı bağlantısı kurulamadı'}), 500

        cursor = conn.cursor()
        cursor.execute("""
            SELECT g.GorevID, g.GorevAdi, g.Aciklama, g.TeslimTarihi,
                   g.ProjeID, p.ProjeAdi,
                   g.DurumID, d.DurumAdi,
                   g.OncelikID, o.OncelikAdi
            FROM GOREVLER g
            LEFT JOIN PROJELER p ON g.ProjeID = p.ProjeID
            LEFT JOIN DURUMLAR d ON g.DurumID = d.DurumID
            LEFT JOIN ONCELIKLER o ON g.OncelikID = o.OncelikID
            WHERE g.GorevID = ?
        """, (id,))

        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Görev bulunamadı'}), 404

        gorev = {
            'GorevID': row.GorevID,
            'GorevAdi': row.GorevAdi,
            'Aciklama': row.Aciklama,
            'TeslimTarihi': format_date(row.TeslimTarihi),
            'ProjeID': row.ProjeID,
            'ProjeAdi': row.ProjeAdi if row.ProjeAdi else '',
            'DurumID': row.DurumID,
            'DurumAdi': row.DurumAdi if row.DurumAdi else '',
            'OncelikID': row.OncelikID,
            'OncelikAdi': row.OncelikAdi if row.OncelikAdi else ''
        }

        conn.close()
        return jsonify(gorev)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/gorevler', methods=['POST'])
def create_gorev():
    """Yeni görev oluşturur"""
    try:
        data = request.json
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Veritabanı bağlantısı kurulamadı'}), 500

        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO GOREVLER (GorevAdi, Aciklama, TeslimTarihi, ProjeID, DurumID, OncelikID)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            data['GorevAdi'],
            data.get('Aciklama'),
            data['TeslimTarihi'],
            data['ProjeID'],
            data.get('DurumID', 1),
            data.get('OncelikID', 3)
        ))

        conn.commit()

        cursor.execute("SELECT @@IDENTITY")
        new_id = cursor.fetchone()[0]

        conn.close()
        return jsonify({'message': 'Görev oluşturuldu', 'GorevID': new_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/gorevler/<int:id>', methods=['PUT'])
def update_gorev(id):
    """Görev bilgilerini günceller"""
    try:
        data = request.json
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Veritabanı bağlantısı kurulamadı'}), 500

        cursor = conn.cursor()
        cursor.execute("""
            UPDATE GOREVLER
            SET GorevAdi = ?, Aciklama = ?, TeslimTarihi = ?, 
                ProjeID = ?, DurumID = ?, OncelikID = ?
            WHERE GorevID = ?
        """, (
            data['GorevAdi'],
            data.get('Aciklama'),
            data['TeslimTarihi'],
            data['ProjeID'],
            data['DurumID'],
            data['OncelikID'],
            id
        ))

        conn.commit()
        conn.close()
        return jsonify({'message': 'Görev güncellendi'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/gorevler/<int:id>', methods=['DELETE'])
def delete_gorev(id):
    """Görev siler"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Veritabanı bağlantısı kurulamadı'}), 500

        cursor = conn.cursor()
        cursor.execute("DELETE FROM GOREVLER WHERE GorevID = ?", (id,))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Görev silindi'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ========================================
# EKİP ÜYELERİ - KULLANICI BAZLI
# ========================================

@app.route('/api/ekip', methods=['GET'])
def get_ekip():
    """Kullanıcının projelerindeki ekip üyelerini listeler"""
    try:
        # Kullanıcı ID'sini query parametresinden al
        kullanici_id = request.args.get('kullanici_id', type=int)

        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Veritabanı bağlantısı kurulamadı'}), 500

        cursor = conn.cursor()

        if kullanici_id:
            # Kullanıcının projelerindeki tüm ekip üyeleri
            cursor.execute("""
                SELECT DISTINCT k.KullaniciID, k.Ad, k.Soyad, k.Eposta, r.RolAdi
                FROM KULLANICILAR k
                LEFT JOIN PROJE_UYE_ILISKISI pui ON k.KullaniciID = pui.KullaniciID
                LEFT JOIN ROLLER r ON pui.RolID = r.RolID
                WHERE pui.ProjeID IN (
                    SELECT DISTINCT p.ProjeID
                    FROM PROJELER p
                    LEFT JOIN PROJE_UYE_ILISKISI pui2 ON p.ProjeID = pui2.ProjeID
                    WHERE p.YoneticiID = ? OR pui2.KullaniciID = ?
                )
                ORDER BY k.Ad, k.Soyad
            """, (kullanici_id, kullanici_id))
        else:
            # Tüm kullanıcılar (admin görünümü)
            cursor.execute("""
                SELECT DISTINCT k.KullaniciID, k.Ad, k.Soyad, k.Eposta, r.RolAdi
                FROM KULLANICILAR k
                LEFT JOIN PROJE_UYE_ILISKISI pui ON k.KullaniciID = pui.KullaniciID
                LEFT JOIN ROLLER r ON pui.RolID = r.RolID
                ORDER BY k.Ad, k.Soyad
            """)

        ekip = []
        for row in cursor.fetchall():
            ekip.append({
                'KullaniciID': row.KullaniciID,
                'Ad': row.Ad,
                'Soyad': row.Soyad,
                'Eposta': row.Eposta,
                'Rol': row.RolAdi if row.RolAdi else 'Ekip Üyesi'
            })

        conn.close()
        return jsonify(ekip)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ========================================
# YORUMLAR Endpoints
# ========================================

@app.route('/api/yorumlar/gorev/<int:gorev_id>', methods=['GET'])
def get_yorumlar(gorev_id):
    """Belirli bir göreve ait yorumları listeler"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Veritabanı bağlantısı kurulamadı'}), 500

        cursor = conn.cursor()
        cursor.execute("""
            SELECT y.YorumID, y.YorumMetni, y.Tarih,
                   k.Ad, k.Soyad
            FROM YORUMLAR y
            JOIN KULLANICILAR k ON y.KullaniciID = k.KullaniciID
            WHERE y.GorevID = ?
            ORDER BY y.Tarih DESC
        """, (gorev_id,))

        yorumlar = []
        for row in cursor.fetchall():
            yorumlar.append({
                'YorumID': row.YorumID,
                'YorumMetni': row.YorumMetni,
                'Tarih': str(row.Tarih),
                'KullaniciAd': row.Ad,
                'KullaniciSoyad': row.Soyad
            })

        conn.close()
        return jsonify(yorumlar)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/yorumlar', methods=['POST'])
def create_yorum():
    """Yeni yorum oluşturur"""
    try:
        data = request.json
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Veritabanı bağlantısı kurulamadı'}), 500

        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO YORUMLAR (GorevID, KullaniciID, YorumMetni)
            VALUES (?, ?, ?)
        """, (data['GorevID'], data['KullaniciID'], data['YorumMetni']))

        conn.commit()

        cursor.execute("SELECT @@IDENTITY")
        new_id = cursor.fetchone()[0]

        conn.close()
        return jsonify({'message': 'Yorum eklendi', 'YorumID': new_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ========================================
# KAYIT OL (Register) Endpoint
# ========================================

@app.route('/api/register', methods=['POST'])
def register():
    """Yeni kullanıcı kaydı"""
    try:
        data = request.json

        # Zorunlu alanları kontrol et
        if not all(k in data for k in ['Ad', 'Soyad', 'Eposta', 'Sifre']):
            return jsonify({'error': 'Tüm alanları doldurun'}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Veritabanı bağlantısı kurulamadı'}), 500

        cursor = conn.cursor()

        # E-posta kontrolü - Bu e-posta daha önce kullanılmış mı?
        cursor.execute("SELECT KullaniciID FROM KULLANICILAR WHERE Eposta = ?", (data['Eposta'],))
        if cursor.fetchone():
            conn.close()
            return jsonify({'error': 'Bu e-posta adresi zaten kullanılıyor'}), 400

        # Şifreyi hash'le
        sifre_hash = hash_password(data['Sifre'])

        # Kullanıcıyı veritabanına ekle
        cursor.execute("""
            INSERT INTO KULLANICILAR (Ad, Soyad, Eposta, SifreHash)
            VALUES (?, ?, ?, ?)
        """, (data['Ad'], data['Soyad'], data['Eposta'], sifre_hash))

        conn.commit()

        # Yeni oluşturulan kullanıcının ID'sini al
        cursor.execute("SELECT @@IDENTITY")
        new_id = cursor.fetchone()[0]

        conn.close()

        return jsonify({
            'message': 'Kayıt başarılı! Şimdi giriş yapabilirsiniz.',
            'KullaniciID': int(new_id),
            'Ad': data['Ad'],
            'Soyad': data['Soyad'],
            'Eposta': data['Eposta']
        }), 201

    except Exception as e:
        return jsonify({'error': f'Kayıt sırasında hata: {str(e)}'}), 500


# ========================================
# Login/Authentication Endpoint
# ========================================

@app.route('/api/login', methods=['POST'])
def login():
    """Kullanıcı girişi"""
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')

        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Veritabanı bağlantısı kurulamadı'}), 500

        cursor = conn.cursor()
        cursor.execute("""
            SELECT KullaniciID, Ad, Soyad, Eposta, SifreHash
            FROM KULLANICILAR
            WHERE Eposta = ?
        """, (email,))

        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Kullanıcı bulunamadı'}), 404

        # Şifre kontrolü
        password_hash = hash_password(password)
        if password_hash != row.SifreHash:
            return jsonify({'error': 'Şifre hatalı'}), 401

        user = {
            'KullaniciID': row.KullaniciID,
            'Ad': row.Ad,
            'Soyad': row.Soyad,
            'Eposta': row.Eposta
        }

        conn.close()
        return jsonify({'message': 'Giriş başarılı', 'user': user})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ========================================
# PROFIL YÖNETİMİ Endpoints
# ========================================

@app.route('/api/profil/<int:kullanici_id>', methods=['GET'])
def get_profil(kullanici_id):
    """Kullanıcı profil bilgilerini getirir"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Veritabanı bağlantısı kurulamadı'}), 500

        cursor = conn.cursor()
        cursor.execute("""
            SELECT k.KullaniciID, k.Ad, k.Soyad, k.Eposta,
                   COUNT(DISTINCT pui.ProjeID) as ProjeCount,
                   COUNT(DISTINCT ga.GorevID) as GorevCount
            FROM KULLANICILAR k
            LEFT JOIN PROJE_UYE_ILISKISI pui ON k.KullaniciID = pui.KullaniciID
            LEFT JOIN GOREV_ATAMALARI ga ON k.KullaniciID = ga.KullaniciID
            WHERE k.KullaniciID = ?
            GROUP BY k.KullaniciID, k.Ad, k.Soyad, k.Eposta
        """, (kullanici_id,))

        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Kullanıcı bulunamadı'}), 404

        profil = {
            'KullaniciID': row.KullaniciID,
            'Ad': row.Ad,
            'Soyad': row.Soyad,
            'Eposta': row.Eposta,
            'ProjeCount': row.ProjeCount or 0,
            'GorevCount': row.GorevCount or 0
        }

        conn.close()
        return jsonify(profil)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/profil/<int:kullanici_id>', methods=['PUT'])
def update_profil(kullanici_id):
    """Kullanıcı profil bilgilerini günceller"""
    try:
        data = request.json
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Veritabanı bağlantısı kurulamadı'}), 500

        cursor = conn.cursor()

        # E-posta değişiyorsa, başka kullanıcı tarafından kullanılıp kullanılmadığını kontrol et
        if 'Eposta' in data:
            cursor.execute("""
                SELECT KullaniciID FROM KULLANICILAR 
                WHERE Eposta = ? AND KullaniciID != ?
            """, (data['Eposta'], kullanici_id))
            if cursor.fetchone():
                return jsonify({'error': 'Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor'}), 400

        # Profil bilgilerini güncelle
        cursor.execute("""
            UPDATE KULLANICILAR
            SET Ad = ?, Soyad = ?, Eposta = ?
            WHERE KullaniciID = ?
        """, (data['Ad'], data['Soyad'], data['Eposta'], kullanici_id))

        conn.commit()
        conn.close()
        return jsonify({'message': 'Profil bilgileri güncellendi'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/profil/<int:kullanici_id>/sifre', methods=['PUT'])
def change_password(kullanici_id):
    """Kullanıcı şifresini değiştirir"""
    try:
        data = request.json

        if not all(k in data for k in ['EskiSifre', 'YeniSifre']):
            return jsonify({'error': 'Eksik bilgi'}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Veritabanı bağlantısı kurulamadı'}), 500

        cursor = conn.cursor()

        # Mevcut şifreyi kontrol et
        cursor.execute("""
            SELECT SifreHash FROM KULLANICILAR WHERE KullaniciID = ?
        """, (kullanici_id,))

        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Kullanıcı bulunamadı'}), 404

        # Eski şifre kontrolü
        eski_sifre_hash = hash_password(data['EskiSifre'])
        if eski_sifre_hash != row.SifreHash:
            return jsonify({'error': 'Mevcut şifre hatalı'}), 401

        # Yeni şifreyi güncelle
        yeni_sifre_hash = hash_password(data['YeniSifre'])
        cursor.execute("""
            UPDATE KULLANICILAR
            SET SifreHash = ?
            WHERE KullaniciID = ?
        """, (yeni_sifre_hash, kullanici_id))

        conn.commit()
        conn.close()
        return jsonify({'message': 'Şifre başarıyla değiştirildi'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/profil/<int:kullanici_id>/gorevler', methods=['GET'])
def get_kullanici_gorevler(kullanici_id):
    """Kullanıcının atanmış olduğu görevleri getirir"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Veritabanı bağlantısı kurulamadı'}), 500

        cursor = conn.cursor()
        cursor.execute("""
            SELECT g.GorevID, g.GorevAdi, g.TeslimTarihi,
                   p.ProjeAdi, d.DurumAdi, o.OncelikAdi
            FROM GOREV_ATAMALARI ga
            JOIN GOREVLER g ON ga.GorevID = g.GorevID
            JOIN PROJELER p ON g.ProjeID = p.ProjeID
            JOIN DURUMLAR d ON g.DurumID = d.DurumID
            JOIN ONCELIKLER o ON g.OncelikID = o.OncelikID
            WHERE ga.KullaniciID = ?
            ORDER BY g.TeslimTarihi ASC
        """, (kullanici_id,))

        gorevler = []
        for row in cursor.fetchall():
            gorevler.append({
                'GorevID': row.GorevID,
                'GorevAdi': row.GorevAdi,
                'TeslimTarihi': format_date(row.TeslimTarihi),
                'ProjeAdi': row.ProjeAdi,
                'DurumAdi': row.DurumAdi,
                'OncelikAdi': row.OncelikAdi
            })

        conn.close()
        return jsonify(gorevler)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/profil/<int:kullanici_id>/projeler', methods=['GET'])
def get_kullanici_projeler(kullanici_id):
    """Kullanıcının dahil olduğu projeleri getirir"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Veritabanı bağlantısı kurulamadı'}), 500

        cursor = conn.cursor()
        cursor.execute("""
            SELECT p.ProjeID, p.ProjeAdi, p.BaslangicTarihi, p.BitisTarihi,
                   r.RolAdi
            FROM PROJE_UYE_ILISKISI pui
            JOIN PROJELER p ON pui.ProjeID = p.ProjeID
            LEFT JOIN ROLLER r ON pui.RolID = r.RolID
            WHERE pui.KullaniciID = ?
            ORDER BY p.BaslangicTarihi DESC
        """, (kullanici_id,))

        projeler = []
        for row in cursor.fetchall():
            projeler.append({
                'ProjeID': row.ProjeID,
                'ProjeAdi': row.ProjeAdi,
                'BaslangicTarihi': format_date(row.BaslangicTarihi),
                'BitisTarihi': format_date(row.BitisTarihi) if row.BitisTarihi else None,
                'RolAdi': row.RolAdi if row.RolAdi else 'Ekip Üyesi'
            })

        conn.close()
        return jsonify(projeler)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ========================================
# Health Check
# ========================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """API sağlık kontrolü"""
    try:
        conn = get_db_connection()
        if conn:
            conn.close()
            return jsonify({
                'status': 'healthy',
                'database': 'connected',
                'message': 'PGYS API çalışıyor'
            })
        else:
            return jsonify({
                'status': 'unhealthy',
                'database': 'disconnected',
                'message': 'Veritabanı bağlantısı kurulamadı'
            }), 503
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ========================================
# Error Handlers
# ========================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint bulunamadı'}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Sunucu hatası'}), 500


# ========================================
# Main
# ========================================

if __name__ == '__main__':
    print("""
    🚀 Server başlatılıyor...
    📡 API Endpoint: http://localhost:5000/api
    🔍 Health Check: http://localhost:5000/api/health
    """)

    app.run(debug=True, host='0.0.0.0', port=5000)