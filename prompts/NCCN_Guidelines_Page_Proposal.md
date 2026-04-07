# NCCN Guidelines Page - Implementation Proposal
**Date:** January 4, 2025
**Context:** Replace direct-navis-test navigation with dedicated guidelines page

---

## Current Problem

When users click "NCCN Guidelines" card on home page:
- ❌ Navigates to `/direct-navis-test` with a question
- ❌ Shows chat interface (not ideal for browsing guidelines)
- ❌ Doesn't leverage existing guidelines database
- ❌ No visual presentation of tier 1/2/3 resources

**User expects:**
- ✅ Direct access to NCCN guidelines for their cancer type
- ✅ Visual presentation of resources (PDFs, webinars, articles)
- ✅ Trust tier badges (Tier 1, 2, 3)
- ✅ Related resources organized by relevance

---

## Proposed Solution

### **New Route: `/guidelines` or `/guidelines/[cancer-type]`**

**Two approaches:**

**Option A: Dynamic route with fallback**
```
/guidelines                           → Show all guidelines (no cancer type)
/guidelines/breast-cancer             → Show breast cancer specific
/guidelines/lung-cancer               → Show lung cancer specific
```

**Option B: Query parameter**
```
/guidelines?cancer=breast-cancer      → Show breast cancer specific
/guidelines                           → Show all or user's cancer type
```

**Recommendation: Option A** (cleaner URLs, better SEO)

---

## Page Structure

### **Layout Components:**

```tsx
<GuidelinesPage>
  {/* Hero Section */}
  <GuidelinesHero
    cancerType={cancerType}
    userStage={userStage}
    showPersonalization={hasProfile}
  />

  {/* NCCN Official Guideline - Tier 1 */}
  <NCCNGuidelineCard
    guideline={nccnGuideline}
    cancerType={cancerType}
    stage={userStage}
  />

  {/* Filtered Resources by Tier */}
  <ResourcesGrid>
    <TierSection tier="tier_1" title="Tier 1: Gold Standard">
      {tier1Resources.map(resource => (
        <ResourceCard resource={resource} />
      ))}
    </TierSection>

    <TierSection tier="tier_2" title="Tier 2: Clinical Research">
      {tier2Resources.map(resource => (
        <ResourceCard resource={resource} />
      ))}
    </TierSection>

    <TierSection tier="tier_3" title="Tier 3: Educational & Support">
      {tier3Resources.map(resource => (
        <ResourceCard resource={resource} />
      ))}
    </TierSection>
  </ResourcesGrid>

  {/* Fallback if no content */}
  {!hasContent && <EmptyState cancerType={cancerType} />}

  {/* CTA: Ask Navis */}
  <AskNavisCTA
    prompt={`Ask Navis about ${cancerType} guidelines`}
    cancerType={cancerType}
  />
</GuidelinesPage>
```

---

## Data Flow

### **1. Route Handler**

```typescript
// src/pages/Guidelines.tsx or src/pages/guidelines/[cancerType].tsx

const GuidelinesPage = () => {
  const { cancerType } = useParams(); // from route
  const { profile } = useProfile();

  // Determine which cancer type to show
  const effectiveCancerType = cancerType
    || profile?.diagnosis_type?.toLowerCase().replace(' cancer', '')
    || null;

  // Fetch NCCN guideline info
  const nccnGuideline = getNCCNGuideline(effectiveCancerType || '');

  // Fetch guidelines from database
  const { data: guidelines, isLoading } = useQuery({
    queryKey: ['guidelines', effectiveCancerType],
    queryFn: () => fetchGuidelinesByCancerType(effectiveCancerType)
  });

  // Group by tier
  const tier1 = guidelines?.filter(g => g.content_tier === 'tier_1') || [];
  const tier2 = guidelines?.filter(g => g.content_tier === 'tier_2') || [];
  const tier3 = guidelines?.filter(g => g.content_tier === 'tier_3') || [];

  // ...
};
```

### **2. Database Query**

```typescript
// src/services/guidelinesService.ts

export const fetchGuidelinesByCancerType = async (cancerType: string | null) => {
  const query = supabase
    .from('guidelines')
    .select('*')
    .order('content_tier', { ascending: true }) // Tier 1 first
    .order('created_at', { ascending: false });

  if (cancerType) {
    query.eq('cancer_type', cancerType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching guidelines:', error);
    return [];
  }

  return data;
};

export const fetchGuidelineWithSignedUrl = async (guidelineId: string) => {
  const guideline = await supabase
    .from('guidelines')
    .select('*')
    .eq('id', guidelineId)
    .single();

  if (guideline.data?.file_path) {
    const { data: urlData } = await supabase.storage
      .from('guideline-pdfs')
      .createSignedUrl(guideline.data.file_path, 3600); // 1 hour

    return {
      ...guideline.data,
      signedUrl: urlData?.signedUrl
    };
  }

  return guideline.data;
};
```

---

## Component Specs

### **1. GuidelinesHero**

**Purpose:** Show personalized header with cancer type and stage

```tsx
interface GuidelinesHeroProps {
  cancerType: string | null;
  userStage: string | null;
  showPersonalization: boolean;
}

export const GuidelinesHero: React.FC<GuidelinesHeroProps> = ({
  cancerType,
  userStage,
  showPersonalization
}) => {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">
          {cancerType
            ? `${toTitleCase(cancerType)} Cancer Guidelines`
            : 'Cancer Treatment Guidelines'}
        </h1>

        {showPersonalization && (
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline" className="bg-white/20 text-white border-white/40">
              {cancerType}
            </Badge>
            {userStage && (
              <Badge variant="outline" className="bg-white/20 text-white border-white/40">
                {userStage}
              </Badge>
            )}
          </div>
        )}

        <p className="text-blue-100 mt-4">
          Evidence-based guidelines and resources curated for your journey
        </p>
      </div>
    </div>
  );
};
```

---

### **2. NCCNGuidelineCard** (Featured Tier 1)

**Purpose:** Highlight the official NCCN guideline with external link

```tsx
interface NCCNGuidelineCardProps {
  guideline: NCCNGuideline | null;
  cancerType: string;
  stage: string | null;
}

export const NCCNGuidelineCard: React.FC<NCCNGuidelineCardProps> = ({
  guideline,
  cancerType,
  stage
}) => {
  if (!guideline) return null;

  return (
    <div className="bg-white dark:bg-gray-900 border-2 border-blue-500 rounded-xl p-6 shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <TrustTierBadge tier="tier_1" />
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
              NCCN Official
            </Badge>
          </div>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {guideline.guidelineName}
          </h2>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            The gold standard for {cancerType} cancer treatment
            {stage && ` (${stage})`}
          </p>

          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-4">
            <span>Version: {guideline.version}</span>
            <span>•</span>
            <span>Updated: {guideline.lastUpdated}</span>
          </div>
        </div>

        <ExternalLink className="h-5 w-5 text-blue-600" />
      </div>

      <div className="flex gap-3">
        <Button
          onClick={() => window.open(guideline.url, '_blank')}
          className="bg-blue-600 hover:bg-blue-700"
        >
          View Official NCCN Guideline
        </Button>

        <Button
          onClick={() => navigate(`/direct-navis-test?question=${encodeURIComponent(
            `Explain the NCCN guidelines for ${stage || ''} ${cancerType} cancer`
          )}`)}
          variant="outline"
        >
          Ask Navis to Explain
        </Button>
      </div>
    </div>
  );
};
```

---

### **3. ResourceCard** (Generic for all tiers)

**Purpose:** Display webinars, articles, research papers

```tsx
interface ResourceCardProps {
  resource: Guideline; // from DB
}

export const ResourceCard: React.FC<ResourceCardProps> = ({ resource }) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (resource.file_path) {
      fetchGuidelineWithSignedUrl(resource.id).then(data => {
        setSignedUrl(data.signedUrl);
      });
    }
  }, [resource]);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <TrustTierBadge tier={resource.content_tier} />
        <Badge variant="outline" className="text-xs">
          {resource.content_type}
        </Badge>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
        {resource.title}
      </h3>

      {/* Metadata */}
      <div className="space-y-1 mb-4">
        {resource.speaker && (
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Speaker: {resource.speaker}
          </p>
        )}
        {resource.source && (
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Source: {resource.source}
          </p>
        )}
        {resource.page_count && (
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {resource.page_count} pages • {Math.round(resource.word_count / 200)} min read
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {signedUrl && (
          <Button
            size="sm"
            onClick={() => window.open(signedUrl, '_blank')}
            className="flex-1"
          >
            <FileText className="h-4 w-4 mr-2" />
            View PDF
          </Button>
        )}

        {resource.external_url && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(resource.external_url, '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
```

---

### **4. TierSection** (Organized by tier)

```tsx
interface TierSectionProps {
  tier: 'tier_1' | 'tier_2' | 'tier_3';
  title: string;
  children: React.ReactNode;
}

export const TierSection: React.FC<TierSectionProps> = ({
  tier,
  title,
  children
}) => {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <TrustTierBadge tier={tier} size="lg" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {title}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {children}
      </div>
    </div>
  );
};
```

---

### **5. EmptyState** (Graceful fallback)

```tsx
interface EmptyStateProps {
  cancerType: string | null;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ cancerType }) => {
  return (
    <div className="text-center py-16 px-6">
      <div className="max-w-md mx-auto">
        <FileQuestion className="h-16 w-16 text-gray-400 mx-auto mb-4" />

        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Guidelines Available Yet
        </h3>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {cancerType
            ? `We're working on adding ${cancerType} cancer guidelines. In the meantime, you can:`
            : 'We're building our guidelines library. You can:'}
        </p>

        <div className="space-y-3">
          <Button
            onClick={() => window.open('https://www.nccn.org/guidelines/category_1', '_blank')}
            variant="outline"
            className="w-full"
          >
            Browse NCCN Guidelines Directly
          </Button>

          <Button
            onClick={() => navigate(`/direct-navis-test?question=${encodeURIComponent(
              `What are the treatment guidelines for ${cancerType || 'cancer'}?`
            )}`)}
            className="w-full"
          >
            Ask Navis About Guidelines
          </Button>

          <Button
            onClick={() => navigate('/knowledge')}
            variant="ghost"
            className="w-full"
          >
            Browse Knowledge Base
          </Button>
        </div>
      </div>
    </div>
  );
};
```

---

## Implementation Steps

### **Phase 1: Create Page Structure** (1-2 hours)

1. Create `/src/pages/Guidelines.tsx` or `/src/pages/guidelines/[cancerType].tsx`
2. Set up routing in App.tsx or router config
3. Create basic layout with hero section

### **Phase 2: Database Integration** (1 hour)

1. Create `src/services/guidelinesService.ts`
2. Implement `fetchGuidelinesByCancerType`
3. Implement `fetchGuidelineWithSignedUrl`
4. Add React Query hooks

### **Phase 3: Build Components** (2-3 hours)

1. GuidelinesHero
2. NCCNGuidelineCard
3. ResourceCard
4. TierSection
5. EmptyState

### **Phase 4: Update Navigation** (30 min)

1. Update `handleCardClick` in Home.tsx to navigate to `/guidelines/[cancer-type]`
2. Update any other NCCN guideline links

### **Phase 5: Testing** (1 hour)

1. Test with different cancer types
2. Test empty state (cancer type with no guidelines)
3. Test PDF signed URL generation
4. Test external link opening

---

## Updated Home.tsx handleCardClick

```typescript
const handleCardClick = (cardId: string) => {
  console.log('Card clicked:', cardId);

  // Handle NCCN - navigate to guidelines page
  if (cardId === 'nccn-guidelines' || cardId === 'unlock-nccn') {
    const diagnosis = profile?.diagnosis_type;

    if (diagnosis && diagnosis !== 'General' && diagnosis !== 'Other') {
      // Navigate to cancer-specific guidelines
      const cancerSlug = diagnosis
        .toLowerCase()
        .replace(' cancer', '')
        .replace(/\s+/g, '-');
      navigate(`/guidelines/${cancerSlug}`);
    } else {
      // Navigate to general guidelines page
      navigate('/guidelines');
    }
    return;
  }

  // ... rest of handlers
};
```

---

## Routes Config

```typescript
// In your router setup (e.g., App.tsx or routes.tsx)

<Route path="/guidelines" element={<GuidelinesPage />} />
<Route path="/guidelines/:cancerType" element={<GuidelinesPage />} />
```

---

## Benefits

### **User Experience:**
- ✅ Direct access to relevant guidelines (no chat required)
- ✅ Visual organization by trust tier
- ✅ Easy PDF viewing with signed URLs
- ✅ Clear hierarchy: NCCN → Research → Educational
- ✅ Graceful empty state if no content

### **Technical:**
- ✅ Leverages existing `guidelines` table
- ✅ Reuses `nccnGuidelines.ts` utility
- ✅ Clean separation: guidelines page vs. chat
- ✅ SEO-friendly URLs
- ✅ Easy to add more cancer types

### **Business:**
- ✅ Showcases trust tier system
- ✅ Highlights NCCN partnership
- ✅ Encourages exploration of knowledge base
- ✅ Natural upsell path (premium content)

---

## Fallback Strategy

**If no content in database:**
1. Show EmptyState component
2. Link to official NCCN site
3. Offer "Ask Navis" CTA
4. Link to knowledge base

**If cancer type not in nccnGuidelinesMap:**
1. Show general guidelines (all cancer types)
2. Suggest completing profile
3. Offer search functionality

---

## Next Steps

1. **Approve design approach** (Option A vs B for routes)
2. **Create Phase 1**: Page structure + routing
3. **Integrate database**: Fetch guidelines by cancer type
4. **Build components**: Iteratively add ResourceCard, TierSection, etc.
5. **Update Home.tsx**: Change navigation from direct-navis-test → /guidelines
6. **Test & refine**: Empty states, loading states, error handling

---

## Optional Enhancements (Future)

1. **Search/Filter**: Filter by content_type (webinar, article, research)
2. **Bookmarks**: Save favorite guidelines
3. **PDF Viewer**: Inline PDF viewer instead of external
4. **Related Questions**: AI-generated questions about each guideline
5. **Progress Tracking**: Mark guidelines as "read"
6. **Personalized Recommendations**: Based on stage, genetics, etc.

---

**Estimated Total Time:** 5-7 hours for full implementation

**Priority:** High - Improves UX and showcases trust tier system
