import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { useTenant } from "@/hooks/use-tenant";
import { useTenantReviews, useTenantRatingStats, useCreateReview } from "@/hooks/use-reviews";
import { useSiteSetting } from "@/hooks/use-site-settings";
import { Star, X, Check, MessageSquare, ChevronLeft, ChevronRight, Building2, Menu } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useFeedback } from "@/hooks/use-feedback";
import iskaOSLogo from "/iska systems logos.png";

const TenantReviews = () => {
  const { showSuccess, showError } = useFeedback();
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { tenant, tenantId } = useTenant();
  const { data: reviews, isLoading: loadingReviews } = useTenantReviews(tenantId);
  const { data: stats } = useTenantRatingStats(tenantId);
  const { data: desktopBg } = useSiteSetting("reviews_bg_desktop", tenantId ?? null);
  const { data: mobileBg } = useSiteSetting("reviews_bg_mobile", tenantId ?? null);
  const createReview = useCreateReview();

  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: "",
    comment: "",
    reviewer_name: "",
    reviewer_email: "",
  });

  const bgImage = desktopBg?.value || "/images/hero-1.jpg";
  const bgMobileImage = mobileBg?.value || bgImage;

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  const handleSubmitReview = async () => {
    if (!reviewForm.reviewer_name || !tenantId) {
      showError("Required", "Name is required");
      return;
    }
    if (reviewForm.rating < 1 || reviewForm.rating > 5) {
      showError("Required", "Please select a rating");
      return;
    }
    try {
      await createReview.mutateAsync({
        tenant_id: tenantId,
        rating: reviewForm.rating,
        reviewer_name: reviewForm.reviewer_name,
        reviewer_email: reviewForm.reviewer_email || null,
        title: reviewForm.title || null,
        comment: reviewForm.comment || null,
      });
      showSuccess("Thank you", "Review submitted! Thank you.");
      setShowReviewForm(false);
      setReviewForm({ rating: 5, title: "", comment: "", reviewer_name: "", reviewer_email: "" });
    } catch (err: any) {
      showError("Failed", err.message || "Failed to submit review");
    }
  };

  const reviewsPath = tenant?.slug ? `/t/${tenant.slug}/reviews` : "";
  const isReviewsActive = location.pathname === reviewsPath;

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

      {/* Header: same style as tenant Index */}
      <header className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-8 sm:py-6 lg:px-12">
        <Link to={tenant?.slug ? `/t/${tenant.slug}` : "/"} className="flex items-center gap-2">
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt={tenant?.name} className="h-8 sm:h-10" />
          ) : (
            <img src={iskaOSLogo} alt={tenant?.name || "Iska Service OS"} className="h-8 sm:h-10" />
          )}
        </Link>
        <nav className="hidden gap-2 rounded-full bg-white/10 backdrop-blur-md shadow-lg px-3 py-2 font-body text-xs font-medium uppercase tracking-widest text-white md:flex">
          <Link
            to={tenant?.slug ? `/t/${tenant.slug}` : "/"}
            className="rounded-full px-4 py-2 transition-colors text-white"
          >
            Services
          </Link>
          {tenant?.slug && (
            <Link
              to={reviewsPath}
              className={`rounded-full px-4 py-2 flex items-center gap-1 transition-colors ${isReviewsActive ? "bg-primary text-primary-foreground" : "text-white"}`}
            >
              Reviews
              {stats && stats.average_rating > 0 && (
                <span className="flex items-center gap-0.5 text-[10px]">
                  <Star className="h-3 w-3 fill-current" />
                  {stats.average_rating.toFixed(1)}
                </span>
              )}
            </Link>
          )}
          <a
            href="/account"
            className={`rounded-full px-4 py-2 transition-colors ${location.pathname === "/account" ? "bg-primary text-primary-foreground" : "text-white"}`}
          >
            Account
          </a>
        </nav>
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="rounded-full bg-white/10 p-2.5 text-white backdrop-blur-md md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="bg-card border-border">
            <div className="mt-6 flex flex-col gap-2">
              <Link
                to={tenant?.slug ? `/t/${tenant.slug}` : "/"}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-full px-4 py-3 text-sm font-medium uppercase text-foreground"
              >
                Services
              </Link>
              {tenant?.slug && (
                <Link
                  to={reviewsPath}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-full px-4 py-3 text-sm font-medium uppercase ${isReviewsActive ? "bg-primary text-primary-foreground" : "text-foreground"}`}
                >
                  Reviews
                </Link>
              )}
              <a
                href="/account"
                onClick={() => setMobileMenuOpen(false)}
                className={`rounded-full px-4 py-3 text-sm font-medium uppercase ${location.pathname === "/account" ? "bg-primary text-primary-foreground" : "text-foreground"}`}
              >
                Account
              </a>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-80px)] flex-col px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-8 lg:px-8 lg:pb-20 lg:pt-10">
        {/* Title block: centered */}
        <div className="mb-8 text-center sm:mb-10">
          <h1 className="font-display text-4xl font-bold leading-tight text-hero-foreground sm:text-5xl lg:text-6xl xl:text-7xl">
            What Our
            <br />
            Customers Say
          </h1>
        </div>

        {loadingReviews ? (
          <div className="mt-auto flex justify-center gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 w-72 animate-pulse rounded-xl bg-white/10 backdrop-blur-md" />
            ))}
          </div>
        ) : reviews && reviews.length > 0 ? (
          <div className="relative mt-auto w-full">
            {/* Write a review button (replaces text above nav arrows) */}
            <div className="mb-6 flex justify-center">
              <button
                onClick={() => setShowReviewForm(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground shadow-lg transition-transform hover:scale-[1.02]"
              >
                <MessageSquare className="h-4 w-4" />
                Write a review
              </button>
            </div>
            {/* Nav arrows */}
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
              opts={{ align: "start", loop: false }}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {reviews.map((review) => (
                  <CarouselItem key={review.id} className="pl-2 md:pl-4 md:basis-1/3">
                    <div className="rounded-xl min-h-[320px] flex flex-col bg-sky-500/10 backdrop-blur-md p-5 shadow-lg sm:p-6">
                      <div className="flex items-center gap-1 mb-3">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating ? "fill-white text-white" : "text-white/40"
                            }`}
                          />
                        ))}
                      </div>
                      {review.title && (
                        <h4 className="text-base font-bold text-white mb-2 sm:text-lg">{review.title}</h4>
                      )}
                      {review.comment && (
                        <p className="text-sm text-white/90 leading-relaxed line-clamp-4 mb-4 flex-1 sm:text-base">
                          {review.comment}
                        </p>
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
                      <p className="text-xs text-white/80 mt-1 sm:text-sm">
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        ) : (
          <div className="mx-auto mt-auto w-full max-w-md rounded-xl border-0 bg-white/10 backdrop-blur-md p-8 text-center shadow-lg">
            <Building2 className="mx-auto h-10 w-10 text-hero-muted mb-3" />
            <p className="text-xs text-hero-muted sm:text-sm mb-4">No reviews yet. Be the first to review!</p>
            <button
              onClick={() => setShowReviewForm(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-transform hover:scale-[1.02]"
            >
              <MessageSquare className="h-4 w-4" />
              Write a review
            </button>
          </div>
        )}
      </main>

      {/* Review Form Modal */}
      {showReviewForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="animate-slide-in-right w-full max-w-md rounded-2xl bg-card p-5 shadow-2xl sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-card-foreground sm:text-lg">
                Write a Review
              </h3>
              <button
                onClick={() => setShowReviewForm(false)}
                className="text-muted-foreground hover:text-card-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Rating *</label>
                <div className="mt-1 flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setReviewForm((f) => ({ ...f, rating }))}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          rating <= reviewForm.rating ? "fill-primary text-primary" : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Your Name *</label>
                <input
                  type="text"
                  value={reviewForm.reviewer_name}
                  onChange={(e) => setReviewForm((f) => ({ ...f, reviewer_name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Email (optional)</label>
                <input
                  type="email"
                  value={reviewForm.reviewer_email}
                  onChange={(e) => setReviewForm((f) => ({ ...f, reviewer_email: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Title (optional)</label>
                <input
                  type="text"
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm((f) => ({ ...f, title: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  placeholder="Great experience!"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Your Review</label>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  placeholder="Share your experience..."
                />
              </div>
              <button
                onClick={handleSubmitReview}
                disabled={createReview.isPending}
                className="w-full rounded-xl bg-primary py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:scale-[1.02] transition-transform disabled:opacity-50 sm:text-sm"
              >
                {createReview.isPending ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantReviews;
