import { Link } from "react-router-dom";
import { Star, Building2 } from "lucide-react";
import { usePlatformReviews } from "@/hooks/use-reviews";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { useState, useEffect } from "react";
import iskaOSLogo from "/iska systems logos.png";

const Reviews = () => {
  const { data: reviews, isLoading } = usePlatformReviews();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  return (
    <div className="min-h-screen bg-background font-body">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img src={iskaOSLogo} alt="Iska Service OS" className="h-8 sm:h-10" />
        </Link>
        <nav className="hidden gap-6 text-xs font-medium uppercase tracking-widest text-muted-foreground md:flex">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link to="/reviews" className="text-primary">Reviews</Link>
          <Link to="/login" className="hover:text-foreground">Sign In</Link>
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 flex flex-col justify-center min-h-[calc(100vh-80px)]">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl font-bold text-foreground sm:text-5xl lg:text-6xl mb-4">
            What Our Tenants Say
          </h1>
          <p className="text-lg text-muted-foreground">
            Real feedback from businesses using Iska Service OS
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-secondary" />
            ))}
          </div>
        ) : reviews && reviews.length > 0 ? (
          <div className="relative">
            {/* Edge fade gradients */}
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
            
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
                    <div className="rounded-xl border border-border bg-card p-6 h-full">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? "fill-primary text-primary"
                                    : "text-muted-foreground"
                                }`}
                              />
                            ))}
                          </div>
                          <h3 className="text-sm font-semibold text-card-foreground">{review.reviewer_name}</h3>
                          {review.tenants && (
                            <p className="text-xs text-muted-foreground">
                              {review.tenants.name} · {new Date(review.created_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        {review.is_verified && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary shrink-0">
                            Verified
                          </span>
                        )}
                      </div>
                      {review.title && (
                        <h4 className="text-sm font-semibold text-card-foreground mb-2">{review.title}</h4>
                      )}
                      {review.comment && (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">{review.comment}</p>
                      )}
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
            
            {/* Dot indicators */}
            {count > 0 && (
              <div className="flex justify-center gap-2 mt-6">
                {Array.from({ length: count }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => api?.scrollTo(index)}
                    className={`h-1.5 transition-all ${
                      index === current
                        ? "w-8 bg-primary"
                        : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    } rounded-full`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review!</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Reviews;
