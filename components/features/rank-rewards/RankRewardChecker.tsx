import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import { UserProfile } from '../../../types';
import { RankCelebrationOverlay } from './RankCelebrationOverlay';
import { useAxis } from '../axis/AxisProvider';
import { motion, AnimatePresence } from 'motion/react';
import { Crown, Sparkles } from 'lucide-react';

export const RankRewardChecker: React.FC<{ profile: UserProfile | null, onRedirectProfile?: () => void }> = ({ profile, onRedirectProfile }) => {
  const [showCelebration, setShowCelebration] = useState(false);
  const { triggerAxisMessage } = useAxis();

  useEffect(() => {
    if (!profile) return;

    const checkReward = async () => {
      if (profile.rank_id <= 1) return;
      const localKey = `mz_rank_celebrated_${profile.id}_${profile.rank_id}`;
      for (let i = profile.rank_id + 1; i <= 5; i++) {
        localStorage.removeItem(`mz_rank_celebrated_${profile.id}_${i}`);
      }
      if (localStorage.getItem(localKey)) return;

      // Check cache first to avoid background fetch at boot
      const cachedClaimsKey = `mz_user_rewards_${profile.id}`;
      const cachedClaims = localStorage.getItem(cachedClaimsKey);
      if (cachedClaims) {
        try {
          const claims = JSON.parse(cachedClaims);
          const hasClaim = claims && claims.some((c: any) => c.rank_id === profile.rank_id);
          if (hasClaim) {
            localStorage.setItem(localKey, 'true');
            return;
          }
        } catch (_) {}
      }

      try {
        console.log('[RankRewardChecker] Checking claim existence for current rank with proxy API...');
        const response = await fetch(`/api/user-rank-rewards/${profile.id}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const claims = await response.json();
        // Update cache
        localStorage.setItem(cachedClaimsKey, JSON.stringify(claims || []));

        const hasClaim = claims && claims.some((c: any) => c.rank_id === profile.rank_id);

        if (!hasClaim && !showCelebration) {
          localStorage.setItem(localKey, 'true');

          const currentXp = profile.xp || 0;
          let oldXp = 0;
          if (profile.rank_id === 2) oldXp = 119;
          else if (profile.rank_id === 3) oldXp = 249;
          else if (profile.rank_id === 4) oldXp = 699;
          else if (profile.rank_id === 5) oldXp = 1499;

          // 2. Transition vers le profil
          if (onRedirectProfile) onRedirectProfile();
          
          // 3. Focus sur la progression
          setTimeout(() => {
            const tube = document.getElementById('progression-section');
            if (tube) {
              tube.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            
            // Trigger animation after scroll
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('mz-trigger-tube-animation', {
                 detail: { oldXp, newXp: currentXp }
              }));
            }, 600);
          }, 500);
        }
      } catch (e) {
        console.error("Error in reward checker", e);
      }
    };

    checkReward();

    const handleRankUp = (e: any) => {
      const { rankId, rankName, oldXp, newXp } = e.detail;
      const localKey = `mz_rank_celebrated_${profile.id}_${rankId}`;
      
      if (!localStorage.getItem(localKey)) {
        localStorage.setItem(localKey, 'true');
        
        if (onRedirectProfile) onRedirectProfile();
        
        setTimeout(() => {
          const tube = document.getElementById('progression-section');
          if (tube) tube.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('mz-trigger-tube-animation', {
               detail: { oldXp, newXp }
            }));
          }, 600);
        }, 500);
      }
    };

    const handleAnimationFinished = (e: any) => {
       setShowCelebration(true);
    };

    window.addEventListener('mz-rank-up-detected', handleRankUp);
    window.addEventListener('mz-rank-up-celebration', handleAnimationFinished);
    
    return () => {
      window.removeEventListener('mz-rank-up-detected', handleRankUp);
      window.removeEventListener('mz-rank-up-celebration', handleAnimationFinished);
    };
  }, [profile?.id, profile?.rank_id]);

  if (!profile) return null;

  return (
    <>
      {showCelebration && (
        <RankCelebrationOverlay 
          profile={profile} 
          onClose={() => {
            setShowCelebration(false);
            if (onRedirectProfile) onRedirectProfile();

            setTimeout(() => {
              triggerAxisMessage(
                `Félicitations pour ton passage au rang ${profile.rank_name || ''} ! 🎖️\n\nPartage ta réussite pour propulser ton ascension et gagner encore plus de points d'élite.`,
                "success",
                12000,
                {
                  label: "Partager & Gagner",
                  action: () => {
                    const shareUrl = `${window.location.origin}/?ref=${profile.id}`;
                    if (navigator.share) {
                      navigator.share({
                        title: 'Millionaire Zone Plus',
                        text: `Je viens d'atteindre le rang ${profile.rank_name} sur Millionaire Zone Plus ! Rejoins l'élite toi aussi.`,
                        url: shareUrl,
                      }).catch(() => {
                        navigator.clipboard.writeText(shareUrl);
                      });
                    } else {
                      navigator.clipboard.writeText(shareUrl);
                      alert("Lien de parrainage copié ! Partage-le pour gagner des points.");
                    }
                  }
                }
              );
            }, 1500);
          }} 
        />
      )}
    </>
  );
};
