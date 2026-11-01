// DEMO DATA — synthetic sample listings for Demo Mode. NOT real marketplace information.
// Prices, ratings, review counts and review texts are invented for demonstration only.
// reviewsText intentionally uses mixed formats (12.5K, 2,34,567, 2.3 lakh, 250+) to exercise the normalizer.
const IN = 'INR', US = 'USD';
const row = (marketplaceId, title, price, originalPrice, rating, reviewsText, extra = {}) =>
  ({ marketplaceId, title, price, originalPrice, rating, reviewsText, currency: marketplaceId.endsWith('-us') || ['ebay', 'walmart', 'best-buy'].includes(marketplaceId) ? US : IN, ...extra });

export const DEMO_LISTINGS = [
  // Amazon India
  row('amazon-in', 'Apple iPhone 17 Pro Max 256 GB: 6.9″ Display, A19 Pro Chip', 149900, 154900, 4.6, '12.5K'),
  row('amazon-in', 'Samsung Galaxy S26 Ultra 5G (Titanium Black, 12GB, 256GB)', 129999, 144999, 4.5, '8,420 reviews'),
  row('amazon-in', 'OnePlus 15 5G (Sand Storm, 12GB RAM, 256GB)', 72999, 79999, 4.4, '15.2K'),
  row('amazon-in', 'Google Pixel 10 Pro 5G (Obsidian, 16GB, 256GB)', 109999, 119999, 4.3, '2,340'),
  row('amazon-in', 'Redmi Note 15 Pro+ 5G (Midnight Black, 8GB, 256GB)', 34999, 39999, 4.2, '2,34,567'),
  row('amazon-in', 'Nothing Phone (3) 5G (Black, 12GB RAM, 256GB)', 79999, 84999, 4.1, '6,780'),
  row('amazon-in', 'Vivo X300 Pro 5G (12GB, 256GB)', 109999, null, 4.4, '1.2K'),
  row('amazon-in', 'Apple iPhone 17 Pro Max 512GB', 169900, null, 4.6, '12.5K', { sellerName: 'DemoSeller Retail' }), // same marketplace => same review population
  // Flipkart
  row('flipkart', 'Apple iPhone 17 Pro Max (Cosmic Orange, 256 GB)', 149900, 154900, 4.7, '98,431'),
  row('flipkart', 'SAMSUNG Galaxy S26 Ultra 5G (Titanium Black, 256 GB)', 128999, 144999, 4.5, '21.4K'),
  row('flipkart', 'OnePlus 15 (Sand Storm, 256 GB)', 71999, 79999, 4.4, '34.8K'),
  row('flipkart', 'Redmi Note 15 Pro+ 5G (Midnight Black, 256 GB)', 33999, 39999, 4.3, '2.3 lakh'),
  row('flipkart', 'Nothing Phone (3) (Black, 256 GB)', 78999, 84999, 4.2, '18.9K'),
  row('flipkart', 'Xiaomi 17 Ultra 5G (Black, 16GB, 512GB)', 99999, 109999, 4.5, '3,210'),
  // Croma
  row('croma', 'Apple iPhone 17 Pro Max 256GB Cosmic Orange', 149900, null, 4.6, '1,850'),
  row('croma', 'Samsung Galaxy S26 Ultra 5G 12GB 256GB', 129999, null, 4.4, '960'),
  row('croma', 'Google Pixel 10 Pro 256GB Obsidian', 108999, 119999, 4.4, '410'),
  row('croma', 'Apple iPhone 17 256GB Lavender', 82900, null, 4.5, '2.3K'),
  // Reliance Digital
  row('reliance-digital', 'Apple iPhone 17 Pro Max 256GB', 149900, null, 4.6, '250+'),
  row('reliance-digital', 'OnePlus 15 5G 12GB+256GB', 72999, 79999, 4.3, null), // missing review count
  row('reliance-digital', 'Vivo X300 Pro 5G 12GB 256GB', 108999, 114999, 4.4, '640'),
  // Amazon US
  row('amazon-us', 'Apple iPhone 17 Pro Max, 256GB, Cosmic Orange', 1199, 1199, 4.6, '45.2K'),
  row('amazon-us', 'Samsung Galaxy S26 Ultra 256GB Titanium Black', 1299, 1399, 4.5, '12.8K'),
  row('amazon-us', 'Google Pixel 10 Pro 256GB Obsidian', 999, 1099, 4.4, '9,870'),
  row('amazon-us', 'OnePlus 15 5G 12GB+256GB', 899, 949, 4.3, '3,150'),
  row('amazon-us', 'Apple iPhone 17 256GB Lavender', 799, null, 4.6, '28.6K'),
  // eBay (product reviews only; seller feedback is never counted)
  row('ebay', 'Apple iPhone 17 Pro Max 256GB Unlocked', 1149, 1199, 4.5, '1,420'),
  row('ebay', 'Samsung Galaxy S26 Ultra 256GB Unlocked', 1249, 1399, 4.4, '860'),
  // Walmart
  row('walmart', 'Apple iPhone 17 256GB', 779, 799, 4.5, '6,540'),
  // Best Buy
  row('best-buy', 'Apple iPhone 17 Pro Max 256GB', 1199, null, 4.7, '3,980'),
  row('best-buy', 'Google Pixel 10 Pro 256GB', 999, 1099, 4.5, '2,120'),
];

// Synthetic sample review texts, keyed by canonical product key. Used only for the rule-based demo analytics.
export const DEMO_REVIEWS = {
  'apple iphone 17 pro max': [
    'Battery easily lasts a full day and the camera is superb.',
    'The display is stunning and bright, performance is incredibly smooth.',
    'Build quality feels premium but it heats up during long gaming sessions.',
    'Great phone overall, though it is expensive.',
    'Camera zoom is amazing. A software bug appeared after the update.',
  ],
  'samsung galaxy s26 ultra': [
    'The display is excellent and very sharp.',
    'Camera quality is brilliant, photos look amazing in low light.',
    'Performance is fast and smooth, no lag at all.',
    'Battery drains quickly when using 5G, disappointing.',
    'Software updates fixed most bugs, but the phone gets hot while charging.',
  ],
  'oneplus 15': [
    'Battery life is fantastic and charging is very fast.',
    'Performance is great for gaming, smooth experience.',
    'Display is bright and smooth, love it.',
    'Camera is average in low light, a bit disappointing.',
    'The software has some bugs but the build is solid.',
  ],
  'google pixel 10 pro': [
    'The camera is the best I have used, photos are stunning.',
    'Clean software and the display is gorgeous.',
    'It heats up during video calls and the battery is only okay.',
    'Build quality feels premium and solid.',
    'Performance is good but updates have caused a few bugs.',
  ],
  'vivo x300 pro': [
    'Camera is excellent with great zoom and portrait photos.',
    'Display is crisp and bright.',
    'Battery backup is good and charging is quick.',
    'Software has too many pre-installed apps, annoying.',
    'Build quality is premium.',
  ],
  'xiaomi 17 ultra': [
    'Camera is incredible, zoom is superb.',
    'Display is stunning and performance is fast.',
    'Battery is good but it heats under heavy load.',
    'The software is buggy and has ads, poor experience.',
    'Premium build and great design.',
  ],
  'apple iphone 17': [
    'Smooth performance and a bright display.',
    'Battery lasts all day, very happy.',
    'Camera is good and the build quality is great.',
    'It is expensive for what it offers.',
    'Scratches easily if used without a case.',
  ],
  'redmi note 15 pro plus': [
    'Excellent value, the display is bright and smooth.',
    'Battery is great and charging is fast.',
    'Camera is good in daylight but poor at night.',
    'Software has ads and bugs, disappointing.',
    'Phone heats up while gaming but performance is okay.',
  ],
  'nothing phone 3': [
    'Unique design and premium build quality.',
    'Display is sharp and bright, love the look.',
    'Battery is average and drains fast with gaming.',
    'Software is clean and smooth, great experience.',
    'Camera is decent but not the best.',
  ],
};
