const slides = document.querySelectorAll(".slide");
let currentIndex = 0;

document.querySelector(".next").addEventListener("click", () => {
    changeSlide(currentIndex + 1);
});

document.querySelector(".prev").addEventListener("click", () => {
    changeSlide(currentIndex - 1);
});

function changeSlide(index) {
    if (index < 0) {
        index = slides.length - 1;
    } else if (index >= slides.length) {
        index = 0;
    }
    document.querySelector(".slider").style.transform = `translateX(-${index * 100}%)`;
    currentIndex = index;
}
