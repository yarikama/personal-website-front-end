"""Clips for /learnings/convolutional-networks."""

from manimlib import *

from style import FADED, SAGE, Clip, split_formula, words

C_OUT = R"C_{\mathrm{out}}"
C_IN = R"C_{\mathrm{in}}"


class WeightCount(Clip):
    """A convolutional layer's weight count built up a factor at a time: the
    window, every channel it reads, one filter per channel out. The picture's
    size never comes in. Then the page's three worked numbers."""

    def construct(self):
        head = words("weights in a convolutional layer", font_size=38, color=FADED)
        head.to_edge(UP, buff=0.7)
        count, parts = split_formula(C_OUT, R"\times", C_IN, R"\times", "k", R"\times", "k", font_size=84)
        count.move_to(0.6 * UP)

        window = words("the window", font_size=34, color=FADED)
        window.next_to(parts[4:7], DOWN, buff=0.5)
        reads = words("each channel\\\\it reads", font_size=34, color=FADED)
        reads.next_to(parts[2], DOWN, buff=0.5)
        filters = words("a filter per\\\\channel out", font_size=34, color=FADED)
        filters.next_to(parts[0], DOWN, buff=0.5)

        self.play(Write(head), run_time=1.2)
        self.play(FadeIn(parts[4:7], shift=0.2 * DOWN), FadeIn(window), run_time=1.0)
        self.wait(0.8)
        self.play(FadeIn(parts[2:4], shift=0.2 * RIGHT), FadeIn(reads), run_time=1.0)
        self.wait(0.8)
        self.play(FadeIn(parts[0:2], shift=0.2 * RIGHT), FadeIn(filters), run_time=1.0)
        self.wait(1.0)

        nowhere = words("the picture's height and width: nowhere", font_size=36, color=SAGE)
        nowhere.to_edge(DOWN, buff=1.2)
        self.play(FadeIn(nowhere, shift=0.2 * UP), run_time=1.0)
        self.wait(1.6)

        # The page's three worked numbers, under the count
        self.play(
            FadeOut(VGroup(window, reads, filters, nowhere)),
            count.animate.scale(0.75).next_to(head, DOWN, buff=0.6),
            run_time=1.0,
        )
        rows = [
            ("story, layer 1", ["3", R"\times", "1", R"\times", "3", R"\times", "3", "=", "27"]),
            ("story, layer 2", ["2", R"\times", "3", R"\times", "3", R"\times", "3", "=", "54"]),
            ("AlexNet, layer 1", ["96", R"\times", "3", R"\times", "11", R"\times", "11", "=", "34{,}848"]),
        ]
        lines = VGroup()
        for name, pieces in rows:
            label = words(name, font_size=34, color=FADED)
            sums, bits = split_formula(*pieces, font_size=64)
            bits[-1].set_color(SAGE)
            lines.add(VGroup(label, sums))
        lines.arrange(DOWN, buff=0.45)
        for label, sums in lines:
            label.set_x(-1.0, direction=RIGHT)
            sums.next_to(label, RIGHT, buff=0.6)
        lines.next_to(count, DOWN, buff=0.7)
        for line in lines:
            self.play(FadeIn(line, shift=0.2 * DOWN), run_time=0.9)
            self.wait(0.6)
        self.wait(3)
