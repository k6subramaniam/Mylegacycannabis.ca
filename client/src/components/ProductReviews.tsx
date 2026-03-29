/**
 * ProductReviews — customer review display + structured review submission form.
 *
 * Captures recommendation signals: star rating, descriptor tags, strength/smoothness
 * sliders, effect tags, experience level, usage timing, and would-recommend.
 *
 * Supports:
 * - New review submission (auto-approved, appears immediately)
 * - Edit own existing review (logged-in users)
 * - All labels are internationalised via useT()
 */

import { useState, useEffect } from 'react';
import { Star, ThumbsUp, ChevronDown, ChevronUp, User, MessageSquare, Pencil, Info } from 'lucide-react';
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
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-display bg-[#F5F0FF] text-[#4B2D8E] border border-[#E0D4F5]">
      {tag}
      <span className="bg-[#4B2D8E] text-white rounded-full px-1 text-[10px] leading-4">{count}</span>
    </span>
  );
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ────────────────────────────────────────────────────────────────
// REVIEW FORM (create + edit modes)
// ────────────────────────────────────────────────────────────────

interface ReviewFormProps {
  productId: number;
  onSuccess: () => void;
  editReview?: any; // if provided, switches to edit mode
  onCancelEdit?: () => void;
}

function ReviewForm({ productId, onSuccess, editReview, onCancelEdit }: ReviewFormProps) {
  const { t } = useT();
  const rv = t.reviews;
  const isEditing = !!editReview;

  const [rating, setRating] = useState(editReview?.rating || 0);
  const [title, setTitle] = useState(editReview?.title || '');
  const [body, setBody] = useState(editReview?.body || '');
  const [tags, setTags] = useState<string[]>(editReview?.tags || []);
  const [strengthRating, setStrengthRating] = useState(editReview?.strengthRating || 3);
  const [smoothnessRating, setSmoothnessRating] = useState(editReview?.smoothnessRating || 3);
  const [effectTags, setEffectTags] = useState<string[]>(editReview?.effectTags || []);
  const [experienceLevel, setExperienceLevel] = useState<string>(editReview?.experienceLevel || '');
  const [usageTiming, setUsageTiming] = useState<string>(editReview?.usageTiming || '');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(editReview?.wouldRecommend ?? null);

  // Re-sync form if editReview changes
  useEffect(() => {
    if (editReview) {
      setRating(editReview.rating || 0);
      setTitle(editReview.title || '');
      setBody(editReview.body || '');
      setTags(editReview.tags || []);
      setStrengthRating(editReview.strengthRating || 3);
      setSmoothnessRating(editReview.smoothnessRating || 3);
      setEffectTags(editReview.effectTags || []);
      setExperienceLevel(editReview.experienceLevel || '');
      setUsageTiming(editReview.usageTiming || '');
      setWouldRecommend(editReview.wouldRecommend ?? null);
    }
  }, [editReview]);

  const submitMutation = trpc.store.submitReview.useMutation({
    onSuccess: () => {
      toast.success(rv.thankYou);
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.store.updateReview.useMutation({
    onSuccess: () => {
      toast.success(rv.reviewUpdated || 'Review updated!');
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
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
    const payload = {
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
    };
    if (isEditing) {
      updateMutation.mutate({ reviewId: editReview.id, ...payload });
    } else {
      submitMutation.mutate({ productId, ...payload });
    }
  };

  const isPending = submitMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="bg-[#FAFAFA] rounded-2xl p-6 border border-gray-200 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-[#4B2D8E]">
          {isEditing ? (rv.editReview || 'Edit Your Review') : rv.writeReview}
        </h3>
        {isEditing && onCancelEdit && (
          <button type="button" onClick={onCancelEdit} className="text-sm text-gray-500 hover:text-gray-700 font-display">
            {rv.cancelEdit || 'Cancel'}
          </button>
        )}
      </div>

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
        disabled={isPending || rating === 0}
        className="w-full bg-[#4B2D8E] hover:bg-[#3a2270] disabled:opacity-50 disabled:cursor-not-allowed text-white font-display py-3 rounded-full transition-all"
      >
        {isPending
          ? rv.submitting
          : isEditing
            ? (rv.updateReview || 'Update Review')
            : rv.submitReview}
      </button>
    </form>
  );
}

// ────────────────────────────────────────────────────────────────
// REVIEW CARD
// ────────────────────────────────────────────────────────────────

function ReviewCard({ review, isOwn, onEdit }: { review: any; isOwn?: boolean; onEdit?: () => void }) {
  const { t } = useT();
  const rv = t.reviews;
  const [expanded, setExpanded] = useState(false);

  // Check if the review has any structured details worth showing
  const hasTags = review.tags && review.tags.length > 0;
  const hasEffects = review.effectTags && review.effectTags.length > 0;
  const hasStrength = !!review.strengthRating;
  const hasSmoothness = !!review.smoothnessRating;
  const hasExperience = !!review.experienceLevel;
  const hasTiming = !!review.usageTiming;
  const hasRecommend = review.wouldRecommend !== null && review.wouldRecommend !== undefined;
  const hasDetails = hasTags || hasEffects || hasStrength || hasSmoothness || hasExperience || hasTiming || hasRecommend;

  // Build a compact inline summary (shown always when details exist)
  const summaryParts: string[] = [];
  if (hasStrength) summaryParts.push(`${rv.strengthLabel} ${review.strengthRating}/5`);
  if (hasSmoothness) summaryParts.push(`${rv.smoothnessLabel} ${review.smoothnessRating}/5`);
  if (hasExperience) summaryParts.push((rv.experienceLevels as any)[review.experienceLevel]);
  if (hasTiming) summaryParts.push((rv.timings as any)[review.usageTiming]);

  return (
    <article className="border-b border-gray-200 pb-4 last:border-b-0">
      {/* Header: avatar, stars, title, date, edit */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#4B2D8E] flex items-center justify-center shrink-0">
            <User size={14} className="text-white" />
          </div>
          <div className="flex items-center gap-2">
            <StarRating value={review.rating} size={14} />
            {review.title && (
              <span className="font-display text-sm text-[#2C2C2C]">— {review.title}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isOwn && onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-1 text-xs text-[#4B2D8E] hover:text-[#3a2270] font-display transition-colors"
              title={rv.editReview || 'Edit'}
            >
              <Pencil size={12} />
              {rv.editLabel || 'Edit'}
            </button>
          )}
          <span className="text-[11px] text-gray-400 font-body">{formatDate(review.createdAt)}</span>
        </div>
      </div>

      {/* Body text */}
      {review.body && <p className="text-sm text-gray-600 font-body leading-relaxed ml-[42px] mb-1">{review.body}</p>}

      {/* Compact detail summary + toggle */}
      {hasDetails && (
        <div className="ml-[42px]">
          {/* Inline compact chips: recommend + top tags (max 3) shown always */}
          <div className="flex items-center flex-wrap gap-1.5 mt-1">
            {hasRecommend && review.wouldRecommend && (
              <span className="inline-flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-display border border-green-200">
                <ThumbsUp size={10} /> {rv.recommended}
              </span>
            )}
            {hasTags && review.tags.slice(0, 3).map((tag: string) => (
              <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-[#F5F0FF] text-[#4B2D8E] font-display">
                {(rv.tags as any)[tag] || tag}
              </span>
            ))}
            {hasEffects && review.effectTags.slice(0, 2).map((tag: string) => (
              <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-[#FFF4F0] text-[#F15929] font-display">
                {(rv.effects as any)[tag] || tag}
              </span>
            ))}
            {/* "more" toggle */}
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-0.5 text-[11px] text-gray-400 hover:text-[#4B2D8E] font-display transition-colors"
            >
              <Info size={11} />
              {expanded ? (rv.lessDetails || 'Less') : (rv.moreDetails || 'Details')}
            </button>
          </div>

          {/* Expanded details */}
          {expanded && (
            <div className="mt-2 pl-1 space-y-1.5 text-[11px] text-gray-500 font-body border-l-2 border-[#E0D4F5] ml-1">
              {/* All tags */}
              {hasTags && (
                <div className="flex flex-wrap gap-1 pl-2">
                  {review.tags.map((tag: string) => (
                    <span key={tag} className="px-1.5 py-0.5 rounded bg-[#F5F0FF] text-[#4B2D8E] font-display">
                      {(rv.tags as any)[tag] || tag}
                    </span>
                  ))}
                </div>
              )}
              {/* All effects */}
              {hasEffects && (
                <div className="flex flex-wrap gap-1 pl-2">
                  {review.effectTags.map((tag: string) => (
                    <span key={tag} className="px-1.5 py-0.5 rounded bg-[#FFF4F0] text-[#F15929] font-display">
                      {(rv.effects as any)[tag] || tag}
                    </span>
                  ))}
                </div>
              )}
              {/* Metrics row */}
              {summaryParts.length > 0 && (
                <p className="pl-2">{summaryParts.join(' · ')}</p>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// ────────────────────────────────────────────────────────────────
// MAIN EXPORT: ProductReviews
// ────────────────────────────────────────────────────────────────

export default function ProductReviews({ productId, isLoggedIn, userId }: { productId: number; isLoggedIn: boolean; userId?: number }) {
  const { t } = useT();
  const rv = t.reviews;

  const { data, isLoading, refetch } = trpc.store.productReviews.useQuery({ productId });
  const [formOpen, setFormOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [editingReview, setEditingReview] = useState<any>(null);

  const reviews = data?.reviews || [];
  const agg = data?.aggregate;
  const visibleReviews = showAll ? reviews : reviews.slice(0, 3);

  // Check if user already reviewed this product
  const userReview = userId ? reviews.find((r: any) => r.userId === userId) : null;
  const hasReviewed = !!userReview;

  if (isLoading) return null;

  const handleEditClick = (review: any) => {
    setEditingReview(review);
    setFormOpen(true);
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingReview(null);
    refetch();
  };

  const handleCancelEdit = () => {
    setEditingReview(null);
    if (hasReviewed) setFormOpen(false);
  };

  return (
    <section className="mt-12 pt-10 border-t border-gray-200" id="reviews">
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl text-[#4B2D8E]">{rv.title}</h2>
        {isLoggedIn && !formOpen && (
          <button
            onClick={() => {
              if (hasReviewed) {
                // Edit existing review
                setEditingReview(userReview);
              }
              setFormOpen(true);
            }}
            className="flex items-center gap-1.5 text-sm font-display text-[#F15929] hover:text-[#d94d22] transition-colors"
          >
            {hasReviewed ? (
              <>
                <Pencil size={16} />
                {rv.editReview || 'Edit Your Review'}
              </>
            ) : (
              <>
                <MessageSquare size={16} />
                {rv.writeReview}
              </>
            )}
          </button>
        )}
      </div>

      {/* Aggregate summary — compact single row */}
      {agg && agg.count > 0 && (
        <div className="bg-[#FAFAFA] rounded-xl px-4 py-3 mb-5 border border-gray-100">
          <div className="flex items-center flex-wrap gap-x-5 gap-y-2">
            {/* Average rating */}
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl text-[#4B2D8E] leading-none">{agg.avgRating}</span>
              <div>
                <StarRating value={Math.round(agg.avgRating)} size={14} />
                <p className="text-[11px] text-gray-500 font-body">{agg.count} {rv.reviews}</p>
              </div>
            </div>

            <span className="hidden sm:block w-px h-8 bg-gray-200" />

            {/* Avg Strength */}
            {agg.avgStrength !== null && (
              <div className="text-center">
                <div className="font-display text-base text-[#4B2D8E] leading-tight">{agg.avgStrength}/5</div>
                <p className="text-[10px] text-gray-500 font-body">{rv.avgStrength}</p>
              </div>
            )}

            {/* Avg Smoothness */}
            {agg.avgSmoothness !== null && (
              <div className="text-center">
                <div className="font-display text-base text-[#4B2D8E] leading-tight">{agg.avgSmoothness}/5</div>
                <p className="text-[10px] text-gray-500 font-body">{rv.avgSmoothness}</p>
              </div>
            )}

            {/* Recommend % */}
            {agg.recommendPercent !== null && (
              <div className="text-center">
                <div className="font-display text-base text-green-600 leading-tight">{agg.recommendPercent}%</div>
                <p className="text-[10px] text-gray-500 font-body">{rv.recommended}</p>
              </div>
            )}

            <span className="hidden sm:block w-px h-8 bg-gray-200" />

            {/* Top tags + effects — inline */}
            <div className="flex flex-wrap gap-1.5">
              {agg.topTags.slice(0, 4).map((t: any) => (
                <PillBadge key={t.tag} tag={(rv.tags as any)[t.tag] || t.tag} count={t.count} />
              ))}
              {agg.topEffects.slice(0, 3).map((t: any) => (
                <span key={t.tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-display bg-[#FFF4F0] text-[#F15929] border border-[#FFD6C7]">
                  {(rv.effects as any)[t.tag] || t.tag}
                  <span className="bg-[#F15929] text-white rounded-full px-1 text-[10px] leading-4">{t.count}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Review form — new or edit */}
      {formOpen && isLoggedIn && (
        <div className="mb-8">
          <ReviewForm
            productId={productId}
            editReview={editingReview}
            onSuccess={handleFormSuccess}
            onCancelEdit={handleCancelEdit}
          />
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
        <div className="space-y-3">
          {visibleReviews.map((r: any) => (
            <ReviewCard
              key={r.id}
              review={r}
              isOwn={!!userId && r.userId === userId}
              onEdit={() => handleEditClick(r)}
            />
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
