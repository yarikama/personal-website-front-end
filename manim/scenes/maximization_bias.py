"""Clips for /learnings/maximization-bias."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, words


class DoubleTarget(Clip):
    """Q-learning's max hides two jobs, picking the best next move and
    saying what it is worth, done by one table. Double Q-learning gives each
    job a table of its own."""

    def construct(self):
        title = words("Q-learning's target", font_size=38, color=FADED).to_edge(UP, buff=0.6)
        target, tp = split_formula("r", "+", R"\gamma", R"\max_{a} Q(s',a)", font_size=64, t2c={R"\gamma": FADED})
        target.next_to(title, DOWN, buff=0.6)
        self.play(FadeIn(title, shift=0.2 * DOWN))
        self.play(Write(target), run_time=1.8)
        self.wait(1)

        # The max is a pick and a score
        two_jobs = words("the same table picks the move and scores it", font_size=38, color=FADED).move_to(title)
        split, sp = split_formula("r", "+", R"\gamma", "Q", R"\big(s',", R"\arg\max_{a} Q(s',a)", R"\big)", font_size=64, t2c={R"\gamma": FADED})
        split.move_to(target)
        self.play(
            FadeTransform(title, two_jobs),
            *(ReplacementTransform(tp[i], sp[i]) for i in range(3)),
            FadeTransform(tp[3], VGroup(*sp[3:])),
            run_time=2,
        )
        pick = Brace(sp[5], DOWN, buff=0.15).set_fill(INK)
        pick_words = words("picks", font_size=36).next_to(pick, DOWN, buff=0.15)
        judge = Brace(sp[3], DOWN, buff=0.15).set_fill(INK)
        judge_words = words("scores", font_size=36).next_to(judge, DOWN, buff=0.15)
        self.play(GrowFromCenter(pick), FadeIn(pick_words), GrowFromCenter(judge), FadeIn(judge_words))
        lucky = words("so it scores its luckiest pick", font_size=34, color=FADED).next_to(VGroup(pick_words, judge_words), DOWN, buff=0.5)
        self.play(FadeIn(lucky, shift=0.15 * UP))
        self.wait(2)

        # Two tables: one picks, the other scores
        double_title = words("Double Q-learning: one picks, the other scores", font_size=38, color=FADED).move_to(two_jobs)
        double, dp = split_formula(
            "r", "+", R"\gamma", "Q_2", R"\big(s',", R"\arg\max_{a} Q_1(s',a)", R"\big)",
            font_size=64,
            t2c={R"\gamma": FADED, "Q_2": SAGE},
        )
        double.move_to(split)
        self.play(
            FadeOut(VGroup(pick, pick_words, judge, judge_words, lucky)),
            FadeTransform(two_jobs, double_title),
            *(FadeTransform(sp[i], dp[i]) for i in range(len(sp))),
            run_time=2,
        )
        pick2 = Brace(dp[5], DOWN, buff=0.15).set_fill(INK)
        pick2_words = words("$Q_1$ picks", font_size=36).next_to(pick2, DOWN, buff=0.15)
        judge2 = Brace(dp[3], DOWN, buff=0.15).set_fill(SAGE)
        judge2_words = words("$Q_2$ scores", font_size=36, color=SAGE).next_to(judge2, DOWN, buff=0.15)
        self.play(GrowFromCenter(pick2), FadeIn(pick2_words))
        self.play(GrowFromCenter(judge2), FadeIn(judge2_words))
        fair = words(R"$Q_2$'s errors had no say in the pick:\\its score is fair on average", font_size=34, color=FADED)
        fair.next_to(VGroup(pick2_words, judge2_words), DOWN, buff=0.5)
        self.play(FadeIn(fair, shift=0.15 * UP))
        coin = words("each step, a coin says which table learns", font_size=34, color=FADED).to_edge(DOWN, buff=0.6)
        self.play(FadeIn(coin, shift=0.15 * UP))
        self.wait(4)
