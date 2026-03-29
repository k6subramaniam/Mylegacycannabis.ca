/**
 * ProductReviews — customer review display + structured review submission form.
 *
 * Captures recommendation signals: star rating, descriptor tags, strength/smoothness
 * sliders, effect tags, experience level, usage timing, and would-recommend.
 *
 * All labels are internationalised via useT().
 */

import { useState } from 'react';
import { Star, ThumbsUp, ChevronDown, ChevronUp, User, MessageSquare } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useT } from '@/i18n';
import { toast } from 'sonner';

// ────────────────────────────────────────────────────────────────
// CONSTANTS
// ────────────────────────────────────────────────────────────────

const DESCRIPTOR_TAG_KEYS = [
  'smooth', 'strong', 'mild', 'relaxing', 'energizing', 'flavorful',
  'harsh', 'good-value', 'potent', 'beginner-friendly', 'fruity',
  'earthy', 'sweet', 'gassy', 'long-lasting', 'fast-acting',
] as const;

const EFFECT_TAG_KEYS = [
  'relaxing', 'sleepy', 'euphoric', 'focused', 'creative',
  'social', 'pain-relief', 'anxiety-relief', 'hungry', 'uplifting',
] as const;

const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'experienced'] as const;
const USAGE_TIMINGS = ['daytime', 'nighttime', 'anytime'] as const;

// ────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────

function StarRating({ value, onChange, size = 24, interactive = false }: { value: number; onChange?: (v: number) => void; size?: number; interactive?: boolean }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5" role="group" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          className={interactive ? 'cursor-pointer transition-transform hover:scale-110' : 'cursor-default'}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onChange?.(star)}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
        >
          <Star
            size={size}
            className={
              (hover || value) >= star
                ? 'fill-[#F15929] text-[#F15929]'
                : 'fill-gray-200 text-gray-200'
            }
          />
        </button>
      ))}
    </div>
  );
}

function SliderRow({ label, value, onChange, leftLabel, rightLabel }: {
  label: string; value: number; onChange: (v: number) => void;
  leftLabel: string; rightLabel: string;
}) {
  return (
    <div>
      <label className="block font-display text-xs text-[#4B2D8E] mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 font-body w-16 text-right">{leftLabel}</span>
        <input
          type="range"
          min={1} max={5} step={1} value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="flex-1 accent-[#4B2D8E] h-2 cursor-pointer"
          aria-label={label}
        />
        <span className="text-xs text-gray-500 font-body w-16">{rightLabel}</span>
      </div>
      <div className="flex justify-between px-16 text-[10px] text-gray-400 mt-0.5">
        {[1, 2, 3, 4, 5].map(n => <span key={n}>{n}</span>)}
      </div>
    </div>
  );
}

function TagToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-display transition-all border ${
        active
          ? 'bg-[#4B2D8E] text-white border-[#4B2D8E]'
          : 'bg-white text-gray-600 border-gray-300 hover:border-[#4B2D8E] hover:text-[#4B2D8E]'
      }`}
    >
      {label}
    </button>
  );
}

function PillBadge({ tag, count }: { tag: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-display bg-[#F5F0FF] text-[#4B2D8E] border border-[#E0D4F5]">
      {tag}
      <span className="bg-[#4B2D8E] text-white rounded-full px-1.5 text-[10px] leading-4">{count}</span>
    </span>
  );
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ────────────────────────────────────────────────────────────────
// REVIEW FORM
// ────────────────────────────────────────────────────────────────

function ReviewForm({ productId, onSuccess }: { productId: number; onSuccess: () => void }) {
  const { t } = useT();
  const rv = t.reviews;

  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [strengthRating, setStrengthRating] = useState(3);
  const [smoothnessRating, setSmoothnessRating] = useState(3);
  const [effectTags, setEffectTags] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState<string>('');
  const [usageTiming, setUsageTiming] = useState<string>('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);

  const submitMutation = trpc.store.submitReview.useMutation({
    onSuccess: () => {
      toast.success(rv.thankYou);
      onSuccess();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const toggleTag = (tag: string) =>
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  const toggleEffect = (tag: string) =>
    setEffectTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select a star rating');
      return;
    }
    submitMutation.mutate({
      productId,
      rating,
      title: title.trim() || undefined,
      body: body.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      strengthRating,
      smoothnessRating,
      effectTags: effectTags.length > 0 ? effectTags : undefined,
      experienceLevel: experienceLevel ? experienceLevel as any : undefined,
      usageTiming: usageTiming ? usageTiming as any : undefined,
      wouldRecommend: wouldRecommend ?? undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#FAFAFA] rounded-2xl p-6 border border-gray-200 space-y-6">
      <h3 className="font-display text-lg text-[#4B2D8E]">{rv.writeReview}</h3>

      {/* Star Rating */}
      <div>
        <label className="block font-display text-xs text-[#4B2D8E] mb-2">{rv.ratingLabel} *</label>
        <StarRating value={rating} onChange={setRating} size={32} interactive />
      </div>

      {/* Title */}
      <div>
        <label className="block font-display text-xs text-[#4B2D8E] mb-1">{rv.titleLabel}</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={255}
          placeholder={rv.titlePlaceholder}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-[#4B2D8E]"
        />
      </div>

      {/* Body */}
      <div>
        <label className="block font-display text-xs text-[#4B2D8E] mb-1">{rv.bodyLabel}</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder={rv.bodyPlaceholder}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-[#4B2D8E] resize-none"
        />
      </div>

      {/* Descriptor Tags */}
      <div>
        <label className="block font-display text-xs text-[#4B2D8E] mb-2">{rv.descriptorTags}</label>
        <div className="flex flex-wrap gap-2">
          {DESCRIPTOR_TAG_KEYS.map((key) => (
            <TagToggle
              key={key}
              label={(rv.tags as any)[key] || key}
              active={tags.includes(key)}
              onClick={() => toggleTag(key)}
            />
          ))}
        </div>
      </div>

      {/* Strength & Smoothness */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SliderRow
          label={rv.strengthLabel}
          value={strengthRating}
          onChange={setStrengthRating}
          leftLabel={rv.strengthMild}
          rightLabel={rv.strengthStrong}
        />
        <SliderRow
          label={rv.smoothnessLabel}
          value={smoothnessRating}
          onChange={setSmoothnessRating}
          leftLabel={rv.smoothnessHarsh}
          rightLabel={rv.smoothnessSmooth}
        />
      </div>

      {/* Effect Tags */}
      <div>
        <label className="block font-display text-xs text-[#4B2D8E] mb-2">{rv.effectsLabel}</label>
        <div className="flex flex-wrap gap-2">
          {EFFECT_TAG_KEYS.map((key) => (
            <TagToggle
              key={key}
              label={(rv.effects as any)[key] || key}
              active={effectTags.includes(key)}
              onClick={() => toggleEffect(key)}
            />
          ))}
        </div>
      </div>

      {/* Experience Level & Timing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block font-display text-xs text-[#4B2D8E] mb-2">{rv.experienceLabel}</label>
          <div className="flex gap-2">
            {EXPERIENCE_LEVELS.map((level) => (
              <TagToggle
                key={level}
                label={(rv.experienceLevels as any)[level]}
                active={experienceLevel === level}
                onClick={() => setExperienceLevel(experienceLevel === level ? '' : level)}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="block font-display text-xs text-[#4B2D8E] mb-2">{rv.timingLabel}</label>
          <div className="flex gap-2">
            {USAGE_TIMINGS.map((timing) => (
              <TagToggle
                key={timing}
                label={(rv.timings as any)[timing]}
                active={usageTiming === timing}
                onClick={() => setUsageTiming(usageTiming === timing ? '' : timing)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Would Recommend */}
      <div>
        <label className="block font-display text-xs text-[#4B2D8E] mb-2">{rv.recommendLabel}</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setWouldRecommend(true)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-display border transition-all ${
              wouldRecommend === true
                ? 'bg-green-600 text-white border-green-600'
                : 'border-gray-300 text-gray-600 hover:border-green-600 hover:text-green-600'
            }`}
          >
            <ThumbsUp size={14} />
            {rv.yes}
          </button>
          <button
            type="button"
            onClick={() => setWouldRecommend(false)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-display border transition-all ${
              wouldRecommend === false
                ? 'bg-red-500 text-white border-red-500'
                : 'border-gray-300 text-gray-600 hover:border-red-500 hover:text-red-500'
            }`}
          >
            <ThumbsUp size={14} className="rotate-180" />
            {rv.no}
          </button>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitMutation.isPending || rating === 0}
        className="w-full bg-[#4B2D8E] hover:bg-[#3a2270] disabled:opacity-50 disabled:cursor-not-allowed text-white font-display py-3 rounded-full transition-all"
      >
        {submitMutation.isPending ? rv.submitting : rv.submitReview}
      </button>
    </form>
  );
}

// ────────────────────────────────────────────────────────────────
// REVIEW CARD
// ────────────────────────────────────────────────────────────────

function ReviewCard({ review }: { review: any }) {
  const { t } = useT();
  const rv = t.reviews;

  return (
    <article className="border-b border-gray-200 pb-5 last:border-b-0">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#4B2D8E] flex items-center justify-center shrink-0">
            <User size={16} className="text-white" />
          </div>
          <div>
            <StarRating value={review.rating} size={16} />
            {review.title && (
              <p className="font-display text-sm text-[#2C2C2C] mt-0.5">{review.title}</p>
            )}
          </div>
        </div>
        <span className="text-xs text-gray-400 font-body shrink-0">{formatDate(review.createdAt)}</span>
      </div>

      {review.body && <p className="text-sm text-gray-600 font-body mb-3 leading-relaxed">{review.body}</p>}

      {/* Tags */}
      {review.tags && review.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {review.tags.map((tag: string) => (
            <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-[#F5F0FF] text-[#4B2D8E] font-display">
              {(rv.tags as any)[tag] || tag}
            </span>
          ))}
        </div>
      )}

      {/* Effects */}
      {review.effectTags && review.effectTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {review.effectTags.map((tag: string) => (
            <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-[#FFF4F0] text-[#F15929] font-display">
              {(rv.effects as any)[tag] || tag}
            </span>
          ))}
        </div>
      )}

      {/* Structured info row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500 font-body">
        {review.strengthRating && (
          <span>{rv.strengthLabel}: {review.strengthRating}/5</span>
        )}
        {review.smoothnessRating && (
          <span>{rv.smoothnessLabel}: {review.smoothnessRating}/5</span>
        )}
        {review.experienceLevel && (
          <span>{(rv.experienceLevels as any)[review.experienceLevel]}</span>
        )}
        {review.usageTiming && (
          <span>{(rv.timings as any)[review.usageTiming]}</span>
        )}
        {review.wouldRecommend !== null && review.wouldRecommend !== undefined && (
          <span className={review.wouldRecommend ? 'text-green-600' : 'text-red-500'}>
            {review.wouldRecommend ? `👍 ${rv.recommended}` : ''}
          </span>
        )}
      </div>
    </article>
  );
}

// ────────────────────────────────────────────────────────────────
// MAIN EXPORT: ProductReviews
// ────────────────────────────────────────────────────────────────

export default function ProductReviews({ productId, isLoggedIn }: { productId: number; isLoggedIn: boolean }) {
  const { t } = useT();
  const rv = t.reviews;

  const { data, isLoading, refetch } = trpc.store.productReviews.useQuery({ productId });
  const [formOpen, setFormOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const reviews = data?.reviews || [];
  const agg = data?.aggregate;
  const visibleReviews = showAll ? reviews : reviews.slice(0, 3);

  if (isLoading) return null;

  return (
    <section className="mt-12 pt-10 border-t border-gray-200" id="reviews">
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl text-[#4B2D8E]">{rv.title}</h2>
        {isLoggedIn && (
          <button
            onClick={() => setFormOpen(!formOpen)}
            className="flex items-center gap-1.5 text-sm font-display text-[#F15929] hover:text-[#d94d22] transition-colors"
          >
            <MessageSquare size={16} />
            {rv.writeReview}
          </button>
        )}
      </div>

      {/* Aggregate summary */}
      {agg && agg.count > 0 && (
        <div className="bg-[#FAFAFA] rounded-2xl p-5 mb-6 border border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Average rating */}
            <div className="flex flex-col items-center text-center">
              <div className="font-display text-4xl text-[#4B2D8E]">{agg.avgRating}</div>
              <StarRating value={Math.round(agg.avgRating)} size={18} />
              <p className="text-xs text-gray-500 font-body mt-1">
                {agg.count} {rv.reviews}
              </p>
            </div>

            {/* Avg Strength */}
            {agg.avgStrength !== null && (
              <div className="flex flex-col items-center text-center">
                <div className="font-display text-2xl text-[#4B2D8E]">{agg.avgStrength}/5</div>
                <p className="text-xs text-gray-500 font-body">{rv.avgStrength}</p>
              </div>
            )}

            {/* Avg Smoothness */}
            {agg.avgSmoothness !== null && (
              <div className="flex flex-col items-center text-center">
                <div className="font-display text-2xl text-[#4B2D8E]">{agg.avgSmoothness}/5</div>
                <p className="text-xs text-gray-500 font-body">{rv.avgSmoothness}</p>
              </div>
            )}

            {/* Recommend % */}
            {agg.recommendPercent !== null && (
              <div className="flex flex-col items-center text-center">
                <div className="font-display text-2xl text-green-600">{agg.recommendPercent}%</div>
                <p className="text-xs text-gray-500 font-body">{rv.recommended}</p>
              </div>
            )}
          </div>

          {/* Top tags */}
          {agg.topTags.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 font-body mb-2">{rv.topTags}</p>
              <div className="flex flex-wrap gap-2">
                {agg.topTags.map((t: any) => (
                  <PillBadge key={t.tag} tag={(rv.tags as any)[t.tag] || t.tag} count={t.count} />
                ))}
              </div>
            </div>
          )}

          {/* Top effects */}
          {agg.topEffects.length > 0 && (
            <div className="mt-3">
              <div className="flex flex-wrap gap-2">
                {agg.topEffects.map((t: any) => (
                  <span key={t.tag} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-display bg-[#FFF4F0] text-[#F15929] border border-[#FFD6C7]">
                    {(rv.effects as any)[t.tag] || t.tag}
                    <span className="bg-[#F15929] text-white rounded-full px-1.5 text-[10px] leading-4">{t.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review form */}
      {formOpen && isLoggedIn && (
        <div className="mb-8">
          <ReviewForm productId={productId} onSuccess={() => { setFormOpen(false); refetch(); }} />
        </div>
      )}

      {/* Login prompt */}
      {!isLoggedIn && reviews.length === 0 && (
        <p className="text-sm text-gray-500 font-body">{rv.loginToReview}</p>
      )}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <p className="text-sm text-gray-500 font-body italic">{rv.noReviews}</p>
      ) : (
        <div className="space-y-5">
          {visibleReviews.map((r: any) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      )}

      {/* Show more / less */}
      {reviews.length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-1 mt-4 text-sm font-display text-[#4B2D8E] hover:text-[#3a2270] transition-colors"
        >
          {showAll ? (
            <>Show Less <ChevronUp size={16} /></>
          ) : (
            <>Show All {reviews.length} {rv.reviews} <ChevronDown size={16} /></>
          )}
        </button>
      )}
    </section>
  );
}
