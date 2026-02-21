import { Link, useLocation } from "react-router-dom";
import { Star, Building2, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { usePlatformReviews } from "@/hooks/use-reviews";
import { useSiteSetting } from "@/hooks/use-site-settings";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { useState, useEffect } from "react";
import iskaOSLogo from "/iska systems logos.png";

const Reviews = () => {
  const { data: reviews, isLoading } = usePlatformReviews();
  const { data: desktopBg } = useSiteSetting("reviews_bg_desktop", null);
  const { data: mobileBg } = useSiteSetting("reviews_bg_mobile", null);
  const location = useLocation();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  const bgImage = desktopBg?.value || "/images/hero-1.jpg";
  const bgMobileImage = mobileBg?.value || bgImage;

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-hero font-body">
      {/* Full-screen Background Image */}
      <div className="absolute inset-0">
        <picture>
          <source media="(max-width: 767px)" srcSet={bgMobileImage} />
          <img
            src={bgImage}
            alt="Reviews"
            className="h-full w-full object-cover grayscale-hero"
          />
        </picture>
        <div className="hero-overlay absolute inset-0" />
      </div>

      {/* Header: same style as Home */}
      <header className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-8 sm:py-6 lg:px-12">
        <Link to="/" className="flex items-center gap-2">
          <img src={iskaOSLogo} alt="Iska Service OS" className="h-8 sm:h-10" />
        </Link>
        <nav className="hidden gap-2 rounded-full bg-white/10 backdrop-blur-md shadow-lg px-3 py-2 font-body text-xs font-medium uppercase tracking-widest text-white md:flex">
          <Link
            to="/"
            className={`rounded-full px-4 py-2 transition-colors ${location.pathname === "/" ? "text-white" : "text-white hover:text-primary"}`}
            style={location.pathname === "/" ? { backgroundColor: "#d16e17" } : {}}
          >
            Home
          </Link>
          <Link
            to="/pricing"
            className={`rounded-full px-4 py-2 transition-colors ${location.pathname === "/pricing" ? "text-white" : "text-white hover:text-primary"}`}
            style={location.pathname === "/pricing" ? { backgroundColor: "#d16e17" } : {}}
          >
            Pricing
          </Link>
          <Link
            to="/reviews"
            className={`rounded-full px-4 py-2 transition-colors ${location.pathname === "/reviews" ? "text-white" : "text-white hover:text-primary"}`}
            style={location.pathname === "/reviews" ? { backgroundColor: "#d16e17" } : {}}
          >
            Reviews
          </Link>
          <a
            href="/login"
            className="rounded-full bg-white px-4 py-2 text-black transition-colors hover:bg-white/90"
          >
            Sign In
          </a>
        </nav>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-80px)] flex-col px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-8 lg:px-8 lg:pb-20 lg:pt-10">
        {/* Title block: centered */}
        <div className="mb-8 text-center sm:mb-10">
          <h1 className="font-display text-4xl font-bold leading-tight text-hero-foreground sm:text-5xl lg:text-6xl xl:text-7xl">
            What Our
            <br />
            Tenants Say
          </h1>
        </div>

        {isLoading ? (
          <div className="mt-auto flex justify-center gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 w-72 animate-pulse rounded-xl bg-white/10 backdrop-blur-md" />
            ))}
          </div>
        ) : reviews && reviews.length > 0 ? (
          <div className="relative mt-auto w-full">
            {/* Description above nav arrows: read feedback / from business using / Iska service OS */}
            <p className="mb-6 text-center font-body text-sm font-medium uppercase tracking-tight leading-relaxed text-white sm:text-base lg:text-[24px]">
              Read feedback
              <br />
              from business using
              <br />
              Iska Service OS
            </p>
            {/* Nav arrows (reference: white circles, black arrows) */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <button
                type="button"
                onClick={() => api?.scrollPrev()}
                disabled={current <= 0}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black shadow-md transition-opacity hover:bg-white/90 disabled:opacity-40 disabled:pointer-events-none"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => api?.scrollNext()}
                disabled={count > 0 && current >= count - 1}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black shadow-md transition-opacity hover:bg-white/90 disabled:opacity-40 disabled:pointer-events-none"
                aria-label="Next testimonial"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <Carousel
              setApi={setApi}
              opts={{
                align: "start",
                loop: false,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {reviews.map((review: any) => (
                  <CarouselItem key={review.id} className="pl-2 md:pl-4 md:basis-1/3">
                    {/* Card: no outline, white font, reference sizes + height */}
                    <div className="rounded-xl min-h-[320px] flex flex-col bg-sky-500/10 backdrop-blur-md p-5 shadow-lg sm:p-6">
                      <div className="flex items-center gap-1 mb-3">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating
                                ? "fill-white text-white"
                                : "text-white/40"
                            }`}
                          />
                        ))}
                      </div>
                      {review.title && (
                        <h4 className="text-base font-bold text-white mb-2 sm:text-lg">{review.title}</h4>
                      )}
                      {review.comment && (
                        <p className="text-sm text-white/90 leading-relaxed line-clamp-4 mb-4 flex-1 sm:text-base">{review.comment}</p>
                      )}
                      <div className="flex items-center justify-between gap-2 mt-auto">
                        <p className="text-sm font-semibold text-white sm:text-base">{review.reviewer_name}</p>
                        {review.is_verified && (
                          <span className="flex items-center gap-0.5 text-xs font-semibold text-white sm:text-sm">
                            <Check className="h-3.5 w-3.5" />
                            Verified
                          </span>
                        )}
                      </div>
                      {review.tenants && (
                        <p className="text-xs text-white/80 mt-1 sm:text-sm">
                          {review.tenants.name} · {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        ) : (
          <div className="mx-auto mt-auto w-full max-w-md rounded-xl border-0 bg-white/10 backdrop-blur-md p-8 text-center shadow-lg">
            <Building2 className="mx-auto h-10 w-10 text-hero-muted mb-3" />
            <p className="text-xs text-hero-muted sm:text-sm">No reviews yet. Be the first to review!</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Reviews;
