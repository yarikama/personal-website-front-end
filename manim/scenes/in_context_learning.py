"""Clips for /learnings/in-context-learning."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, split_words, words

# The stand-in model's numbers for "The new ramp is sick.", from
# src/learnings/in-context-learning/model.ts (STORY): P(great) with 0, 1 and
# 2 examples in the prompt
SHOTS = [("0", "0.14", "0.86", "complaint"), ("1", "0.36", "0.64", "complaint"), ("2", "0.75", "0.25", "praise")]


class IclRule(Clip):
    """The classification rule in words, then in symbols; the examples slide
    into what the model is given, while its weights stay as they were; then
    the shop's numbers for 0, 1 and 2 examples."""

    def construct(self):
        said, sp = split_words(
            "label", "=", "the one", "whose word", "the model", "finds likeliest", "after", "the note",
            font_size=38,
        )
        zero, zp = split_formula(
            R"\hat y", "=", R"\arg\max_{y}\,", R"P_\theta\big(", "v(y)", R"\,\big|\,", "f(x)", R"\big)",
            font_size=60,
            t2c={R"P_\theta\big(": INK},
        )
        said.move_to(UP * 2.0)
        zero.move_to(DOWN * 0.2)

        self.play(Write(said), run_time=2.5)
        self.wait(0.6)
        pairs = [(0, 0), (1, 1), (5, 2), (4, 3), (3, 4), (6, 5), (7, 6)]
        self.play(
            LaggedStart(*(FadeTransform(sp[i].copy(), zp[j]) for i, j in pairs), lag_ratio=0.12),
            FadeOut(sp[2]),
            FadeIn(zp[7]),
            run_time=2.5,
        )
        self.play(FadeOut(said), zero.animate.move_to(UP * 2.4), run_time=1)

        theta = Brace(zp[3], DOWN, buff=0.15).set_fill(FADED)
        frozen = words(R"$\theta$: its weights,\\fixed", font_size=34, color=FADED).next_to(theta, DOWN, buff=0.2)
        self.play(GrowFromCenter(theta), FadeIn(frozen, shift=0.2 * DOWN))
        self.wait(1.2)

        # The examples go in front of the note, inside what the model reads
        icl, ip = split_formula(
            R"\hat y", "=", R"\arg\max_{y}\,", R"P_\theta\big(", "v(y)", R"\,\big|\,",
            R"f(x_1),\,v(y_1),\,\dots,\,f(x_k),\,v(y_k),", R"\,f(x)", R"\big)",
            font_size=56,
            t2c={R"f(x_1),\,v(y_1),\,\dots,\,f(x_k),\,v(y_k),": SAGE},
        )
        if icl.get_width() > FRAME_WIDTH - 0.6:
            icl.set_width(FRAME_WIDTH - 0.6)
        icl.move_to(UP * 2.4)
        self.play(
            *(ReplacementTransform(zp[i], ip[j]) for i, j in [(0, 0), (1, 1), (2, 2), (3, 3), (4, 4), (5, 5), (6, 7), (7, 8)]),
            FadeIn(ip[6], shift=0.3 * DOWN),
            FadeOut(theta),
            FadeOut(frozen),
            run_time=2,
        )
        examples = Brace(ip[6], DOWN, buff=0.15).set_fill(SAGE)
        named = words("the examples in the prompt", font_size=34, color=SAGE).next_to(examples, DOWN, buff=0.2)
        same = words(R"$\theta$ unchanged", font_size=34, color=FADED).next_to(ip[3], UP, buff=0.35)
        self.play(GrowFromCenter(examples), FadeIn(named, shift=0.2 * DOWN), FadeIn(same))
        self.wait(1.5)

        # The shop's numbers: P(great) against P(terrible) for the ramp note
        rows = VGroup()
        for k, great, terrible, label in SHOTS:
            row = VGroup(
                words(f"{k} {'example' if k == '1' else 'examples'}", font_size=36, color=FADED),
                formula(R"\text{great } " + great, font_size=52, color=SAGE if label == "praise" else INK),
                formula(R"\text{terrible } " + terrible, font_size=52, color=INK if label == "complaint" else FADED),
                words(label, font_size=36, color=SAGE if label == "praise" else INK),
            )
            rows.add(row)
        for row in rows:
            for col, x in zip(row, (-5.0, -1.6, 2.0, 5.2)):
                col.move_to([x, 0, 0])
        rows.arrange(DOWN, buff=0.6)
        rows.next_to(named, DOWN, buff=0.9)
        for row in rows:
            for col, x in zip(row, (-5.0, -1.6, 2.0, 5.2)):
                col.set_x(x)
        self.play(FadeOut(same))
        for row in rows:
            self.play(LaggedStart(*(FadeIn(c, shift=0.15 * UP) for c in row), lag_ratio=0.15), run_time=1.2)
            self.wait(0.5)
        self.play(Indicate(rows[2][3], color=SAGE, scale_factor=1.2))
        self.wait(3)
