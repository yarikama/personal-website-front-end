"""Clips for /learnings/rlvr."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, words

# The story's first problem: seven of eight answers pass the checker
REWARDS = [1, 1, 1, 0, 1, 1, 1, 1]
MEAN = sum(REWARDS) / len(REWARDS)  # 0.875
SPREAD = (sum((r - MEAN) ** 2 for r in REWARDS) / len(REWARDS)) ** 0.5  # 0.331


def cells(texts: list[str]) -> VGroup:
    """Eight numbers in two rows of four, a right answer's in sage."""
    group = VGroup()
    for i, (text, r) in enumerate(zip(texts, REWARDS)):
        cell = formula(text, font_size=58, color=SAGE if r else INK)
        cell.move_to(np.array([-4.8 + 3.2 * (i % 4), -0.2 - 1.6 * (i // 4), 0]))
        group.add(cell)
    return group


def signed(value: float, digits: int) -> str:
    return f"{'+' if value > 0 else '-'}{abs(value):.{digits}f}"


class ScoresToAdvantages(Clip):
    """Eight answers scored 1 or 0 by the checker. Subtract the group's mean:
    who beat the group. Divide by the group's spread: the advantage, +0.38
    for each right answer and -2.65 for the one slip."""

    def construct(self):
        title = words("eight answers, scored by the checker", font_size=38, color=FADED).to_edge(UP, buff=0.7)
        scores = cells([str(r) for r in REWARDS])
        self.play(FadeIn(title, shift=0.2 * DOWN), run_time=1)
        self.play(LaggedStart(*(FadeIn(c, scale=0.6) for c in scores), lag_ratio=0.12), run_time=2)
        self.wait(1.2)

        # Subtract the mean
        minus = formula(R"r_i - \mu", font_size=66).to_edge(UP, buff=0.6)
        mean_says = words(fR"$\mu$, the group's mean: $7/8 = {MEAN:.3f}$", font_size=36, color=FADED)
        mean_says.next_to(minus, DOWN, buff=0.35)
        gaps = cells([signed(r - MEAN, 3) for r in REWARDS])
        self.play(FadeOut(title), Write(minus), FadeIn(mean_says), run_time=1.4)
        self.wait(0.6)
        self.play(*(FadeTransform(a, b) for a, b in zip(scores, gaps)), run_time=1.4)
        self.wait(1.6)

        # Divide by the spread
        over = formula(R"\frac{r_i - \mu}{\sigma}", font_size=66).move_to(minus).to_edge(UP, buff=0.4)
        spread_says = words(fR"$\sigma$, how spread the scores are: ${SPREAD:.3f}$", font_size=36, color=FADED)
        spread_says.next_to(over, DOWN, buff=0.3)
        advantages = cells([signed((r - MEAN) / SPREAD, 2) for r in REWARDS])
        self.play(FadeTransform(minus, over), FadeTransform(mean_says, spread_says), run_time=1.2)
        self.wait(0.6)
        self.play(*(FadeTransform(a, b) for a, b in zip(gaps, advantages)), run_time=1.4)
        self.wait(1.4)

        # Name it
        named = formula(R"A_i = \frac{r_i - \mu}{\sigma}", font_size=66, t2c={"A_i": SAGE}).move_to(over)
        says = words("each right answer $+0.38$, the one slip $-2.65$", font_size=38, color=SAGE)
        says.to_edge(DOWN, buff=0.7)
        self.play(FadeTransform(over, named), FadeOut(spread_says), run_time=1.2)
        self.play(FadeIn(says, shift=0.2 * UP))
        self.wait(3.5)
