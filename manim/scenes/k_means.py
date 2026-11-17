"""Clips for /learnings/k-means."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, split_words, words

# The worked example (src/learnings/k-means/model.ts, tested there): six
# points on a line, two centres that both start on the left. Each round:
# which centre each point is with, the cost then, where the centres move,
# and the cost after.
POINTS = [1, 3, 4, 8, 9, 10]
START = [1, 3]
ROUNDS = [
    ([0, 1, 1, 1, 1, 1], "111", [1, 6.8], "38.8"),
    ([0, 0, 1, 1, 1, 1], "28.36", [2, 7.75], "22.75"),
    ([0, 0, 0, 1, 1, 1], "12.69", [8 / 3, 9], "6.67"),
]
COLOURS = [INK, SAGE]


class LloydRounds(Clip):
    """The objective in words, then in symbols. Then three rounds of Lloyd's
    algorithm on six points: each assignment and each move of the centres
    lowers it, from 111 to 6.67."""

    def construct(self):
        said, sp = split_words(
            "objective", "=", "add up, over every point,", R"(its distance to its centre)$^2$",
            font_size=38,
        )
        rule, rp = split_formula(
            "J", "=", R"\sum_{x}", R"\lVert x - \mu_{c(x)} \rVert^{2}",
            font_size=64,
            t2c={R"\mu_{c(x)}": SAGE},
        )
        said.to_edge(UP, buff=0.9)
        rule.next_to(said, DOWN, buff=0.7)
        self.play(Write(said), run_time=1.8)
        self.wait(0.6)
        self.play(
            LaggedStart(*(FadeTransform(sp[i].copy(), rp[i]) for i in range(4)), lag_ratio=0.15),
            run_time=1.8,
        )
        self.play(FadeOut(said), rule.animate.scale(0.8).to_edge(UP, buff=0.5), run_time=1)

        # The line, the six points, and the two centres above it
        line = NumberLine(x_range=[0, 11, 1], width=12, color=RULE, tick_size=0.06, stroke_width=3)
        line.shift(0.3 * DOWN)
        dots = VGroup(*(Dot(line.n2p(x), radius=0.14, fill_color=FADED) for x in POINTS))
        labels = VGroup(
            *(formula(str(x), font_size=34, color=FADED).next_to(line.n2p(x), DOWN, buff=0.3) for x in POINTS)
        )

        def marker(x, colour):
            tip = Triangle(fill_color=colour, fill_opacity=1, stroke_width=0).scale(0.22).rotate(PI)
            return tip.next_to(line.n2p(x), UP, buff=0.32)

        centres = VGroup(*(marker(x, c) for x, c in zip(START, COLOURS)))
        centre_words = words("two centres", font_size=34, color=FADED).next_to(centres, UP, buff=0.35)
        self.play(ShowCreation(line), FadeIn(dots), FadeIn(labels), run_time=1.2)
        self.play(FadeIn(centres, shift=0.2 * DOWN), FadeIn(centre_words))
        self.wait(0.5)
        self.play(FadeOut(centre_words), run_time=0.5)

        score = formula("J = 111", font_size=56).to_edge(DOWN, buff=1.1)
        trail = []
        history = VGroup()

        for r, (groups, assigned, moved, after) in enumerate(ROUNDS):
            # Assign: each point takes its nearest centre's colour
            step = words(f"round {r + 1}: assign", font_size=34, color=FADED).next_to(line, UP, buff=1.6)
            self.play(FadeIn(step), run_time=0.3)
            self.play(*(d.animate.set_fill(COLOURS[g]) for d, g in zip(dots, groups)), run_time=0.7)
            now = formula(f"J = {assigned}", font_size=56).move_to(score)
            if r == 0:
                self.play(FadeIn(now, shift=0.2 * UP), run_time=0.5)
            else:
                self.play(Transform(score, now), run_time=0.5)
            score = now if r == 0 else score
            self.wait(0.2)

            # Update: each centre to the mean of its points
            step2 = words(f"round {r + 1}: move", font_size=34, color=FADED).move_to(step)
            self.play(FadeTransform(step, step2), run_time=0.3)
            targets = [marker(x, c) for x, c in zip(moved, COLOURS)]
            self.play(*(Transform(m, t) for m, t in zip(centres, targets)), run_time=0.9)
            done = formula(f"J = {after}", font_size=56, color=SAGE).move_to(score)
            self.play(Transform(score, done), run_time=0.5)
            trail.append(after)
            self.wait(0.3)
            self.play(FadeOut(step2), score.animate.set_fill(INK), run_time=0.3)

        # The whole fall, and why
        fall = formula(R"J\colon\ 111 \to 38.8 \to 22.75 \to 6.67", font_size=52).move_to(score)
        self.play(FadeTransform(score, fall), run_time=1)
        why = words("each step can only lower $J$", font_size=38, color=SAGE).next_to(line, UP, buff=1.6)
        self.play(FadeIn(why, shift=0.2 * UP))
        self.wait(3)
