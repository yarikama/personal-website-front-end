"""Clips for /learnings/attention."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, words

# The numbers come from src/learnings/attention/model.ts (the "dark" step of
# the dessert menu); its tests check the rounded sum lands on (0.92, 0.26)
FRENCH = ["mousse", "au", "chocolat", "noir"]
SCORES = ["0", "0", "1.5", "4"]
WEIGHTS = ["0.02", "0.02", "0.07", "0.89"]
STATES = ["(0.1, 0.9)", "(0, 0.1)", "(0.4, 0.9)", "(1, 0.2)"]
CONTEXT = "(0.92,\\ 0.26)"
COLUMNS = [-3.3, -0.65, 2.0, 4.65]
TOP = 3  # noir, the word "dark" leans on


class OneStep(Clip):
    """One decoder step, writing "dark": each French word gets a score, the
    scores become weights that add up to 1, and the weights mix the encoder
    states into one context vector."""

    def construct(self):
        rule, rp = split_formula(
            "c_t", "=", R"\sum_j", "a_{tj}", "s_j",
            font_size=60,
            t2c={"a_{tj}": SAGE},
        )
        rule.to_edge(UP, buff=0.45)
        writing = words("writing ``dark''", font_size=34, color=FADED).next_to(rule, RIGHT, buff=0.8)

        # None of the four words has a descender, so their bottoms are the baseline
        heads = VGroup(*(words(w, font_size=38).move_to([x, 0, 0]) for w, x in zip(FRENCH, COLUMNS)))
        for head in heads:
            head.shift((1.6 - head.get_bottom()[1]) * UP)
        rows_y = [0.75, -0.35, -1.45]
        labels = VGroup(
            *(
                words(name, font_size=34, color=FADED).move_to([-5.9, y, 0])
                for name, y in zip(["score", "weight", "state"], rows_y)
            )
        )
        line = Line([-6.8, 1.25, 0], [6.8, 1.25, 0], color=RULE, stroke_width=2)

        def row(values, y, color_top=INK):
            return VGroup(
                *(
                    formula(v, font_size=52, color=color_top if j == TOP else INK).move_to([x, y, 0])
                    for j, (v, x) in enumerate(zip(values, COLUMNS))
                )
            )

        scores = row(SCORES, rows_y[0], SAGE)
        weights = row(WEIGHTS, rows_y[1], SAGE)
        states = VGroup(
            *(formula(v, font_size=46).move_to([x, rows_y[2], 0]) for v, x in zip(STATES, COLUMNS))
        )

        self.play(Write(rule), run_time=1.8)
        self.play(FadeIn(writing, shift=0.2 * LEFT))
        self.play(LaggedStart(*(FadeIn(h, shift=0.2 * DOWN) for h in heads), lag_ratio=0.15), ShowCreation(line))
        self.wait(0.4)

        # How well each word fits what is about to be written
        self.play(FadeIn(labels[0]), LaggedStart(*(FadeIn(s, scale=0.8) for s in scores), lag_ratio=0.15))
        self.wait(0.8)

        # e to each score, over the total: positive, and they add up to 1
        how = words(R"$e^{\mathrm{score}}$ over the total: they add up to 1", font_size=34, color=FADED)
        how.to_edge(DOWN, buff=0.55)
        self.play(FadeIn(labels[1]), FadeIn(how))
        self.play(
            LaggedStart(*(TransformFromCopy(s, w) for s, w in zip(scores, weights)), lag_ratio=0.15),
            run_time=2,
        )
        self.play(Indicate(rp[3], color=SAGE))
        self.wait(1)

        # Each encoder state, cut to two numbers: colour, food
        self.play(FadeOut(how), FadeIn(labels[2]), LaggedStart(*(FadeIn(s) for s in states), lag_ratio=0.15))
        self.wait(0.8)

        # The weighted sum: every column pours into one context
        result, res = split_formula("c_t", "=", CONTEXT, font_size=60, t2c={CONTEXT: SAGE})
        result.to_edge(DOWN, buff=0.5).shift(1.2 * LEFT)
        note = words("mostly colour", font_size=34, color=SAGE).next_to(result, RIGHT, buff=0.6)
        pieces = [VGroup(w, s).copy() for w, s in zip(weights, states)]
        self.play(FadeIn(res[0:2]))
        self.play(
            LaggedStart(*(p.animate.scale(0.3).move_to(res[2]).set_opacity(0) for p in pieces), lag_ratio=0.2),
            FadeIn(res[2], run_time=2.2),
            run_time=2.6,
        )
        self.play(FadeIn(note, shift=0.2 * LEFT))
        self.play(Indicate(rp[0], color=SAGE))
        self.wait(3)
