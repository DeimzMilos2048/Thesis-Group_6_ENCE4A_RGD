   const imageData = [
            { id: 1, category: 'nature', title: 'Forest Path', description: 'A serene path through autumn woods', src: 'https://picsum.photos/400/400?random=1', size: 'normal' },
            { id: 2, category: 'architecture', title: 'Modern Building', description: 'Contemporary architectural design', src: 'https://picsum.photos/400/600?random=2', size: 'tall' },
            { id: 3, category: 'portrait', title: 'City Portrait', description: 'Urban lifestyle photography', src: 'https://picsum.photos/800/400?random=3', size: 'wide' },
            { id: 4, category: 'abstract', title: 'Color Waves', description: 'Abstract color composition', src: 'https://picsum.photos/400/400?random=4', size: 'normal' },
            { id: 5, category: 'landscape', title: 'Mountain View', description: 'Breathtaking mountain landscape', src: 'https://picsum.photos/800/800?random=5', size: 'large' },
            { id: 6, category: 'nature', title: 'Ocean Waves', description: 'Peaceful ocean scenery', src: 'https://picsum.photos/400/400?random=6', size: 'normal' },
            { id: 7, category: 'architecture', title: 'Glass Tower', description: 'Reflective glass architecture', src: 'https://picsum.photos/400/400?random=7', size: 'normal' },
            { id: 8, category: 'portrait', title: 'Street Art', description: 'Urban art and culture', src: 'https://picsum.photos/400/600?random=8', size: 'tall' },
            { id: 9, category: 'abstract', title: 'Light Patterns', description: 'Geometric light design', src: 'https://picsum.photos/400/400?random=9', size: 'normal' },
            { id: 10, category: 'landscape', title: 'Desert Sunset', description: 'Golden hour in the desert', src: 'https://picsum.photos/800/400?random=10', size: 'wide' },
            { id: 11, category: 'nature', title: 'Flower Garden', description: 'Colorful spring blooms', src: 'https://picsum.photos/400/400?random=11', size: 'normal' },
            { id: 12, category: 'architecture', title: 'Bridge Structure', description: 'Engineering marvel', src: 'https://picsum.photos/400/400?random=12', size: 'normal' },
            { id: 13, category: 'portrait', title: 'Night Life', description: 'Urban nighttime photography', src: 'https://picsum.photos/400/600?random=13', size: 'tall' },
            { id: 14, category: 'abstract', title: 'Texture Study', description: 'Material and texture exploration', src: 'https://picsum.photos/400/400?random=14', size: 'normal' },
            { id: 15, category: 'landscape', title: 'Lake Reflection', description: 'Mirror-like water surface', src: 'https://picsum.photos/800/800?random=15', size: 'large' }
        ];

        let currentFilter = 'all';
        let currentImageIndex = 0;
        let displayedImages = [];
        let itemsPerLoad = 9;
        let loadedItems = 0;

        // DOM elements
        const galleryGrid = document.getElementById('galleryGrid');
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        const lightbox = document.getElementById('lightbox');
        const lightboxImage = document.getElementById('lightboxImage');
        const lightboxTitle = document.getElementById('lightboxTitle');
        const lightboxDescription = document.getElementById('lightboxDescription');
        const lightboxClose = document.getElementById('lightboxClose');
        const lightboxPrev = document.getElementById('lightboxPrev');
        const lightboxNext = document.getElementById('lightboxNext');

        // Initialize gallery
        function initGallery() {
            displayedImages = [...imageData]; // Show all images without filtering
            loadImages();
            setupEventListeners();
        }

        // Get filtered images based on current filter
        function getFilteredImages() {
            if (currentFilter === 'all') {
                return [...imageData];
            }
            return imageData.filter(img => img.category === currentFilter);
        }

        // Load images into the gallery
        function loadImages() {
            const imagesToShow = displayedImages.slice(loadedItems, loadedItems + itemsPerLoad);
            
            imagesToShow.forEach((image, index) => {
                setTimeout(() => {
                    createImageElement(image);
                }, index * 100);
            });

            loadedItems += imagesToShow.length;

            // Hide load more button if all images are loaded
            if (loadedItems >= displayedImages.length) {
                loadMoreBtn.style.display = 'none';
            } else {
                loadMoreBtn.style.display = 'block';
            }
        }

        // Create image element
        function createImageElement(image) {
            const imageElement = document.createElement('div');
            imageElement.className = `gallery-item ${image.size} fade-in`;
            imageElement.dataset.category = image.category;
            imageElement.dataset.index = displayedImages.indexOf(image);

            imageElement.innerHTML = `
                <img src="${image.src}" alt="${image.title}" loading="lazy">
                <div class="gallery-item-overlay">
                    <div class="overlay-icon">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path>
                            <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"></path>
                        </svg>
                    </div>
                    <div class="overlay-text">
                        <h3>${image.title}</h3>
                        <p>${image.description}</p>
                    </div>
                </div>
            `;

            imageElement.addEventListener('click', () => openLightbox(displayedImages.indexOf(image)));
            galleryGrid.appendChild(imageElement);
        }

        // Filter images
        function filterImages(category) {
            currentFilter = category;
            
            // Add fade out effect
            const items = galleryGrid.querySelectorAll('.gallery-item');
            items.forEach((item, index) => {
                setTimeout(() => {
                    item.classList.add('fade-out');
                }, index * 50);
            });

            // Clear gallery and reset counters
            setTimeout(() => {
                galleryGrid.innerHTML = '';
                loadedItems = 0;
                displayedImages = getFilteredImages();
                loadImages();
            }, 500);
        }

        // Open lightbox
        function openLightbox(index) {
            currentImageIndex = index;
            const image = displayedImages[index];
            
            lightboxImage.src = image.src;
            lightboxTitle.textContent = image.title;
            lightboxDescription.textContent = image.description;
            
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        // Close lightbox
        function closeLightbox() {
            lightbox.classList.remove('active');
            document.body.style.overflow = 'auto';
        }

        // Navigate lightbox
        function navigateLightbox(direction) {
            if (direction === 'next') {
                currentImageIndex = (currentImageIndex + 1) % displayedImages.length;
            } else {
                currentImageIndex = currentImageIndex === 0 ? displayedImages.length - 1 : currentImageIndex - 1;
            }
            
            const image = displayedImages[currentImageIndex];
            lightboxImage.src = image.src;
            lightboxTitle.textContent = image.title;
            lightboxDescription.textContent = image.description;
        }

        // Setup event listeners
        function setupEventListeners() {
            // Load more button
            loadMoreBtn.addEventListener('click', loadImages);

            // Lightbox controls
            lightboxClose.addEventListener('click', closeLightbox);
            lightboxPrev.addEventListener('click', () => navigateLightbox('prev'));
            lightboxNext.addEventListener('click', () => navigateLightbox('next'));

            // Lightbox background click
            lightbox.addEventListener('click', (e) => {
                if (e.target === lightbox) {
                    closeLightbox();
                }
            });

            // Keyboard navigation
            document.addEventListener('keydown', (e) => {
                if (lightbox.classList.contains('active')) {
                    switch(e.key) {
                        case 'Escape':
                            closeLightbox();
                            break;
                        case 'ArrowLeft':
                            navigateLightbox('prev');
                            break;
                        case 'ArrowRight':
                            navigateLightbox('next');
                            break;
                    }
                }
            });

            // Swipe gestures for mobile
            let startX = 0;
            let endX = 0;

            lightbox.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
            });

            lightbox.addEventListener('touchend', (e) => {
                endX = e.changedTouches[0].clientX;
                const difference = startX - endX;
                
                if (Math.abs(difference) > 50) {
                    if (difference > 0) {
                        navigateLightbox('next');
                    } else {
                        navigateLightbox('prev');
                    }
                }
            });
        }

        // Intersection Observer for lazy loading animation
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Observe gallery items as they're created
        const originalCreateImageElement = createImageElement;
        createImageElement = function(image) {
            const element = originalCreateImageElement.call(this, image);
            observer.observe(element);
            return element;
        };

        // Initialize gallery when DOM is loaded
        document.addEventListener('DOMContentLoaded', initGallery);

        // Handle window resize
        window.addEventListener('resize', () => {
            // Recalculate grid layout if needed
            const items = document.querySelectorAll('.gallery-item');
            items.forEach(item => {
                if (window.innerWidth <= 768) {
                    item.classList.remove('wide', 'large');
                }
            });
        });