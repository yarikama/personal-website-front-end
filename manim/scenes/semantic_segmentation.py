"""Clips for /learnings/semantic-segmentation."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, words

INPUTS = [1, 2, 1, 3]
KERNEL = [1, 1, 1]
STRIDE = 2
OUT = (len(INPUTS) - 1) * STRIDE + len(KERNEL)
CELL = 1.25


class Stamps(Clip):
    """A one-dimensional transposed convolution: four inputs each stamp the
    kernel 1, 1, 1 into the output, two places apart, and the stamps add
    where they overlap. Then why the output is (n - 1) s + k wide."""

    def construct(self):
        x0 = -(OUT - 1) * CELL / 2
        out_x = [x0 + i * CELL for i in range(OUT)]
        in_y, mid_y, out_y = 1.75, 0.35, -0.95

        def box(x, y, color=RULE):
            return RoundedRectangle(width=CELL * 0.88, height=CELL * 0.88, corner_radius=0.12).set_stroke(color, 3).move_to([x, y, 0])

        title = words(R"each input stamps the kernel, 2 apart", font_size=40).to_edge(UP, buff=0.45)
        kernel_note = words(R"kernel 1\,1\,1", font_size=34, color=FADED).next_to(title, DOWN, buff=0.2)

        # Each input sits above the middle of the stamp it will make
        in_x = [out_x[i * STRIDE + 1] for i in range(len(INPUTS))]
        in_boxes = VGroup(*(box(x, in_y, FADED) for x in in_x))
        in_nums = VGroup(*(formula(str(v), font_size=52).move_to(b) for v, b in zip(INPUTS, in_boxes)))
        in_label = words("input", font_size=34, color=FADED).next_to(in_boxes, LEFT, buff=0.4)

        out_boxes = VGroup(*(box(x, out_y) for x in out_x))
        out_label = words("output", font_size=34, color=FADED).next_to(out_boxes, LEFT, buff=0.4)

        self.play(Write(title), FadeIn(kernel_note), run_time=1.6)
        self.play(FadeIn(in_boxes), FadeIn(in_nums), FadeIn(in_label))
        self.play(ShowCreation(out_boxes), FadeIn(out_label))

        sums = [0] * OUT
        shown = [None] * OUT
        for i, v in enumerate(INPUTS):
            start = i * STRIDE
            stamp = VGroup(
                *(
                    VGroup(box(out_x[start + j], mid_y, SAGE), formula(str(v * w), font_size=46, color=SAGE).move_to([out_x[start + j], mid_y, 0]))
                    for j, w in enumerate(KERNEL)
                )
            )
            self.play(TransformFromCopy(in_nums[i], stamp), run_time=0.8)
            for j, w in enumerate(KERNEL):
                sums[start + j] += v * w
            moves = []
            for j in range(len(KERNEL)):
                o = start + j
                new = formula(str(sums[o]), font_size=52).move_to(out_boxes[o])
                piece = stamp[j][1]
                moves.append(piece.animate.move_to(out_boxes[o]).set_opacity(0))
                if shown[o] is None:
                    moves.append(FadeIn(new))
                else:
                    moves.append(Transform(shown[o], new))
                    new = shown[o]
                shown[o] = new
            self.play(*moves, FadeOut(VGroup(*(s[0] for s in stamp))), run_time=0.9)
            self.remove(*(s[1] for s in stamp))

        # The pixels two stamps land on
        twice = [o for o in range(OUT) if sum(1 for i in range(len(INPUTS)) if 0 <= o - i * STRIDE < len(KERNEL)) == 2]
        self.play(*(out_boxes[o].animate.set_stroke(SAGE, 5) for o in twice))
        note = words("two stamps add", font_size=34, color=SAGE).next_to(out_boxes, DOWN, buff=0.3)
        self.play(FadeIn(note, shift=0.2 * UP))
        self.wait(1.2)

        # How wide: the last stamp starts (n - 1) strides along, and is k wide
        self.play(
            FadeOut(VGroup(note, in_boxes, in_nums, in_label)),
            VGroup(out_boxes, out_label, *shown).animate.shift(2.3 * UP),
            run_time=1,
        )
        start_brace = Brace(VGroup(out_boxes[0], out_boxes[(len(INPUTS) - 1) * STRIDE - 1]), DOWN, buff=0.2).set_fill(FADED)
        start_note = formula(R"(4-1)\times 2", font_size=44, color=FADED).next_to(start_brace, DOWN, buff=0.15)
        last_brace = Brace(VGroup(*out_boxes[(len(INPUTS) - 1) * STRIDE :]), DOWN, buff=0.2).set_fill(SAGE)
        last_note = formula("3", font_size=44, color=SAGE).next_to(last_brace, DOWN, buff=0.15)
        self.play(GrowFromCenter(start_brace), FadeIn(start_note))
        self.play(GrowFromCenter(last_brace), FadeIn(last_note))
        self.wait(0.5)

        rule, rp = split_formula(
            R"\text{size}", "=", "(", "n", "-", "1", ")", R"\times", "s", "+", "k",
            font_size=66,
            t2c={"k": SAGE},
        )
        rule.move_to(1.5 * DOWN)
        nums, nump = split_formula("=", "(", "4", "-", "1", ")", R"\times", "2", "+", "3", "=", "9", font_size=60)
        nums.next_to(rule, DOWN, buff=0.35)
        self.play(Write(rule), run_time=1.6)
        self.play(FadeIn(nums, shift=0.2 * UP), run_time=1.2)
        self.play(Indicate(nump[-1], color=INK, scale_factor=1.25))
        self.wait(3)
