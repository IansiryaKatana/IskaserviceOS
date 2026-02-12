import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTenant } from "@/hooks/use-tenant";
import { useTenantReviews, useTenantRatingStats, useCreateReview } from "@/hooks/use-reviews";
import { Star, X, Check, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import iskaOSLogo from "/iska systems logos.png";

const TenantReviews = () => {
  const { slug } = useParams<{ slug: string }>();
  const { tenant, tenantId } = useTenant();
  const { data: reviews, isLoading: loadingReviews } = useTenantReviews(tenantId);
  const { data: stats } = useTenantRatingStats(tenantId);
  const createReview = useCreateReview();
  
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: "",
    comment: "",
    reviewer_name: "",
    reviewer_email: "",
  });

  const handleSubmitReview = async () => {
    if (!reviewForm.reviewer_name || !tenantId) {
      toast.error("Name is required");
      return;
    }
    if (reviewForm.rating < 1 || reviewForm.rating > 5) {
      toast.error("Please select a rating");
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
      toast.success("Review submitted! Thank you.");
      setShowReviewForm(false);
      setReviewForm({ rating: 5, title: "", comment: "", reviewer_name: "", reviewer_email: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    }
  };

  return (
    <div className="min-h-screen bg-background font-body">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-6">
        <Link to={tenant?.slug ? `/t/${tenant.slug}` : "/"} className="flex items-center gap-2">
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt={tenant?.name} className="h-8 sm:h-10" />
          ) : (
            <img src={iskaOSLogo} alt={tenant?.name || "Iska Service OS"} className="h-8 sm:h-10" />
          )}
        </Link>
        <Link
          to={tenant?.slug ? `/t/${tenant.slug}` : "/"}
          className="text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          Back to Booking
        </Link>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl mb-2">
            Reviews for {tenant?.name}
          </h1>
          {stats && (
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-foreground">{stats.average_rating.toFixed(1)}</span>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < Math.round(stats.average_rating)
                          ? "fill-primary text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <span className="text-sm text-muted-foreground">
                Based on {stats.total_reviews} {stats.total_reviews === 1 ? "review" : "reviews"}
              </span>
            </div>
          )}
          <button
            onClick={() => setShowReviewForm(true)}
            className="mt-6 flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-transform hover:scale-105"
          >
            <MessageSquare className="h-4 w-4" />
            Write a Review
          </button>
        </div>

        {loadingReviews ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-secondary" />
            ))}
          </div>
        ) : reviews && reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-xl border border-border bg-card p-6">
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
                    <p className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {review.is_verified && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      Verified
                    </span>
                  )}
                </div>
                {review.title && (
                  <h4 className="text-sm font-semibold text-card-foreground mb-2">{review.title}</h4>
                )}
                {review.comment && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">No reviews yet. Be the first to review!</p>
            <button
              onClick={() => setShowReviewForm(true)}
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-transform hover:scale-105"
            >
              Write First Review
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
                      onClick={() => setReviewForm(f => ({ ...f, rating }))}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          rating <= reviewForm.rating
                            ? "fill-primary text-primary"
                            : "text-muted-foreground"
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
                  onChange={(e) => setReviewForm(f => ({ ...f, reviewer_name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Email (optional)</label>
                <input
                  type="email"
                  value={reviewForm.reviewer_email}
                  onChange={(e) => setReviewForm(f => ({ ...f, reviewer_email: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Title (optional)</label>
                <input
                  type="text"
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm(f => ({ ...f, title: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  placeholder="Great experience!"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Your Review</label>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  placeholder="Share your experience..."
                />
              </div>
              <button
                onClick={handleSubmitReview}
                disabled={createReview.isPending}
                className="w-full rounded-full bg-primary py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:scale-[1.02] transition-transform disabled:opacity-50 sm:text-sm"
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
