# Arda Rodi - UI/UX Designer Portfolio

Modern ve responsive UI/UX tasarımcı portfolyo sitesi. GitHub Pages üzerinde barındırılmaktadır.

## Özellikler

- 🎨 Modern ve minimalist tasarım
- 📱 Tamamen responsive (mobil uyumlu)
- ⚡ Hızlı yükleme süreleri
- 🎯 SEO optimizasyonu
- 💫 Smooth animasyonlar
- 📧 İletişim formu
- 🎭 Hover efektleri
- 📊 Skill progress barları

## Teknolojiler

- HTML5
- CSS3 (Flexbox, Grid, Animations)
- Vanilla JavaScript
- Font Awesome Icons
- Google Fonts (Inter)

## Kurulum

1. Repository'yi fork edin
2. Settings > Pages bölümünden GitHub Pages'i aktifleştirin
3. Source olarak "Deploy from a branch" seçin
4. Branch olarak "main" seçin
5. Siteniz `https://[kullaniciadi].github.io/[repo-adi]` adresinde yayınlanacak

## Özelleştirme

### Kişisel Bilgileri Güncelleme

`index.html` dosyasında aşağıdaki bölümleri kendi bilgilerinizle güncelleyin:

- Hero section (isim, açıklama)
- About section (hakkımda metni)
- Skills section (yetenekler)
- Projects section (projeler)
- Contact section (iletişim bilgileri)

### Renkleri Değiştirme

`styles.css` dosyasının başındaki `:root` bölümünde CSS değişkenlerini değiştirerek site renklerini özelleştirebilirsiniz:

```css
:root {
    --primary-color: #6366f1;
    --secondary-color: #8b5cf6;
    --accent-color: #06b6d4;
    /* ... diğer renkler */
}
```

### Proje Görselleri Ekleme

Proje kartlarına gerçek görseller eklemek için:

1. `images` klasörü oluşturun
2. Proje görsellerinizi yükleyin
3. `index.html`'de ilgili `project-image` div'lerine background-image ekleyin

## İletişim Formu

Şu anda form sadece frontend validation içeriyor. Gerçek bir form handler eklemek için:

- Netlify Forms
- Formspree
- EmailJS
- Firebase Functions

gibi servisleri kullanabilirsiniz.

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## Destek

Herhangi bir sorunuz veya öneriniz varsa, issue açabilir veya benimle iletişime geçebilirsiniz.
