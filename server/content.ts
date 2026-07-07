/**
 * MeHeal - Kho nội dung chuyên môn của phòng khám.
 * Trích từ "Sổ tay chẩn đoán các rối loạn tâm thần thường gặp" của Phòng khám MeHeal.
 * Dùng cho: seed dữ liệu, hiển thị website và ngữ cảnh cho trợ lý AI.
 */

export const CLINIC = {
  name: 'Phòng khám Sức khỏe Tâm thần MeHeal',
  shortName: 'MeHeal',
  tagline: 'Chăm sóc sức khỏe tâm thần toàn diện - Thấu hiểu & Đồng hành',
  intro:
    'Phòng khám chuyên sâu về lĩnh vực sức khỏe tâm thần ở người trưởng thành, tâm thần nhi, ' +
    'tâm thần người cao tuổi, nghiện chất, rối loạn giấc ngủ và các rối loạn liên quan đến Stress. ' +
    'Đội ngũ gồm Thạc sỹ, Bác sỹ chuyên khoa và Nhà trị liệu tâm lý lâm sàng có chuyên môn cao, ' +
    'nhiều năm kinh nghiệm trong nghề.',
  hotline: '0523.175.175',
  email: 'lienhe@meheal.vn',
  facebook: 'https://www.facebook.com/phongkhammeheal',
  workingHours: 'Thứ 2 - Chủ nhật: 7:30 - 17:30',
  facilities: [
    {
      code: 'CS1',
      name: 'Cơ sở 1 - Hưng Yên',
      address: 'Số 496 đường Trần Lãm, phường Trần Lãm, tỉnh Hưng Yên',
    },
    {
      code: 'CS2',
      name: 'Cơ sở 2 - Ninh Bình',
      address: 'Số 141 đường Nguyễn Trãi, phường Nam Định, tỉnh Ninh Bình',
    },
  ],
  specialties: [
    'Tâm thần người trưởng thành',
    'Tâm thần nhi (trẻ em)',
    'Tâm thần người cao tuổi',
    'Điều trị nghiện chất',
    'Rối loạn giấc ngủ',
    'Rối loạn liên quan đến Stress',
    'Trị liệu tâm lý lâm sàng',
  ],
};

export interface Doctor {
  name: string;
  title: string;
  specialty: string;
  room: string;
  facility: string;
  bio: string;
}

export const DOCTORS: Doctor[] = [
  {
    name: 'ThS.BS. Nguyễn Minh Anh',
    title: 'Thạc sỹ, Bác sỹ chuyên khoa Tâm thần',
    specialty: 'Rối loạn lo âu, Trầm cảm, Rối loạn giấc ngủ',
    room: 'P.101',
    facility: 'CS1',
    bio: 'Hơn 15 năm kinh nghiệm điều trị các rối loạn cảm xúc ở người trưởng thành.',
  },
  {
    name: 'BS.CKI. Trần Thị Hồng',
    title: 'Bác sỹ Chuyên khoa I Tâm thần',
    specialty: 'Trầm cảm sau sinh, Rối loạn lưỡng cực',
    room: 'P.102',
    facility: 'CS1',
    bio: 'Chuyên sâu về sức khỏe tâm thần phụ nữ và rối loạn cảm xúc lưỡng cực.',
  },
  {
    name: 'ThS.BS. Lê Quốc Bảo',
    title: 'Thạc sỹ, Bác sỹ Tâm thần Nhi',
    specialty: 'Tự kỷ, Tăng động giảm chú ý (ADHD), Rối loạn học tập',
    room: 'P.103',
    facility: 'CS1',
    bio: 'Chuyên gia can thiệp sớm cho trẻ tự kỷ và rối loạn phát triển.',
  },
  {
    name: 'BS.CKII. Phạm Văn Dũng',
    title: 'Bác sỹ Chuyên khoa II Tâm thần',
    specialty: 'Tâm thần phân liệt, Động kinh, Loạn thần',
    room: 'P.201',
    facility: 'CS2',
    bio: 'Nhiều năm điều trị các rối loạn loạn thần và bệnh lý thần kinh phức tạp.',
  },
  {
    name: 'ThS. Nhà trị liệu Đỗ Thu Hà',
    title: 'Thạc sỹ Tâm lý học lâm sàng',
    specialty: 'Trị liệu tâm lý, Stress, PTSD, Rối loạn thích ứng',
    room: 'P.202',
    facility: 'CS2',
    bio: 'Nhà trị liệu tâm lý lâm sàng, chuyên trị liệu nhận thức - hành vi (CBT).',
  },
  {
    name: 'BS.CKI. Vũ Ngọc Sơn',
    title: 'Bác sỹ Chuyên khoa I Tâm thần',
    specialty: 'Nghiện rượu, Nghiện chất, Cai nghiện',
    room: 'P.203',
    facility: 'CS2',
    bio: 'Chuyên điều trị rối loạn tâm thần và hành vi do sử dụng rượu, chất kích thích.',
  },
];

export interface Service {
  name: string;
  description: string;
  duration: number; // phút
  price: number; // VNĐ
}

export const SERVICES: Service[] = [
  {name: 'Khám tâm thần tổng quát', description: 'Thăm khám, đánh giá và tư vấn ban đầu với bác sỹ chuyên khoa.', duration: 30, price: 300000},
  {name: 'Trị liệu tâm lý cá nhân', description: 'Buổi trị liệu 1-1 với nhà trị liệu tâm lý lâm sàng.', duration: 60, price: 500000},
  {name: 'Đánh giá & test tâm lý', description: 'Thực hiện các thang đo, test trầm cảm - lo âu - nhận thức.', duration: 45, price: 400000},
  {name: 'Khám tâm thần nhi', description: 'Đánh giá phát triển, tự kỷ, tăng động cho trẻ em.', duration: 45, price: 400000},
  {name: 'Tư vấn cai nghiện', description: 'Tư vấn và lập phác đồ hỗ trợ cai rượu, cai chất.', duration: 45, price: 450000},
  {name: 'Khám & điện não đồ (EEG)', description: 'Khám kết hợp đo điện não đồ chẩn đoán động kinh.', duration: 60, price: 650000},
  {name: 'Tái khám', description: 'Theo dõi tiến triển và điều chỉnh phác đồ điều trị.', duration: 20, price: 200000},
];

export interface Disorder {
  slug: string;
  name: string;
  summary: string;
  symptoms: string[];
}

export const DISORDERS: Disorder[] = [
  {
    slug: 'roi-loan-lo-au',
    name: 'Rối loạn lo âu',
    summary:
      'Lo âu bệnh lý là lo âu quá mức hoặc dai dẳng không tương xứng với sự đe dọa được cảm thấy, ảnh hưởng đến hoạt động của người bệnh.',
    symptoms: [
      'Sợ hãi, lo lắng về bất hạnh tương lai, dễ cáu, khó tập trung',
      'Căng thẳng vận động: bồn chồn, đứng ngồi không yên, run tay chân, khó thư giãn',
      'Hoạt động quá mức thần kinh tự trị: ra mồ hôi, mạch nhanh, thở gấp, khó chịu vùng thượng vị, đau đầu chóng mặt',
    ],
  },
  {
    slug: 'roi-loan-dang-co-the',
    name: 'Rối loạn dạng cơ thể',
    summary:
      'Biểu hiện bởi sự tái diễn các triệu chứng cơ thể ở nhiều chuyên khoa, dù đã khám xét nhiều lần với kết quả âm tính.',
    symptoms: [
      'Tim mạch: nhịp nhanh, hồi hộp, đau thắt ngực',
      'Tiêu hóa: đầy bụng, khó tiêu, buồn nôn, ợ hơi ợ chua',
      'Hô hấp: hụt hơi, khó thở',
      'Thần kinh: chóng mặt, đau đầu, đau nhức xương khớp nhiều vị trí',
      'Mệt mỏi, uể oải, rối loạn giấc ngủ, ăn không ngon, sút cân',
    ],
  },
  {
    slug: 'roi-loan-tram-cam',
    name: 'Rối loạn trầm cảm',
    summary:
      'Bệnh rối loạn cảm xúc, biểu hiện bằng ức chế các hoạt động tâm thần: ức chế cảm xúc, tư duy và vận động.',
    symptoms: [
      'Khí sắc giảm, buồn chán, bi quan',
      'Mất mọi quan tâm thích thú, giảm năng lượng, tăng mệt mỏi',
      'Giảm tập trung chú ý, giảm tự tin, ý tưởng bị tội',
      'Rối loạn giấc ngủ, ăn không ngon miệng',
      'Ý tưởng và hành vi tự hủy hoại hoặc tự sát',
    ],
  },
  {
    slug: 'roi-loan-cam-xuc-luong-cuc',
    name: 'Rối loạn cảm xúc lưỡng cực',
    summary:
      'Rối loạn cảm xúc mạn tính, đặc trưng bởi các giai đoạn hưng cảm/hưng cảm nhẹ xen kẽ với các giai đoạn trầm cảm.',
    symptoms: [
      'Giai đoạn trầm cảm: giống bệnh trầm cảm',
      'Giai đoạn hưng cảm: tăng khí sắc, hưng phấn, phấn khích quá mức',
      'Tự cao, khuếch đại, ít ngủ, nói nhiều nói nhanh, ý nghĩ nhanh',
      'Tăng hoạt động, hành vi mất kiềm chế, ngông cuồng liều lĩnh',
    ],
  },
  {
    slug: 'mat-ngu-khong-thuc-ton',
    name: 'Mất ngủ không thực tổn',
    summary:
      'Rối loạn giấc ngủ gồm khó đi vào giấc ngủ, khó duy trì giấc ngủ, dẫn đến thiếu năng lượng và giảm tập trung.',
    symptoms: [
      'Khó đi vào giấc ngủ ban đêm, thao thức',
      'Giấc ngủ chập chờn, không sâu, thức giấc nhiều lần',
      'Dậy rất sớm và khó ngủ lại',
      'Mệt mỏi sau khi thức dậy, cảm giác như chưa được ngủ',
    ],
  },
  {
    slug: 'tram-cam-sau-sinh',
    name: 'Trầm cảm sau sinh',
    summary:
      'Tình trạng rối loạn cảm xúc, thay đổi thể chất và tâm lý, hành vi ở người phụ nữ sau khi sinh con.',
    symptoms: [
      'Chán nản, bồn chồn, ủ rũ, khó chịu và tức giận',
      'Ăn không ngon, mất ngủ, mệt mỏi',
      'Cảm giác xấu hổ hoặc tội lỗi, khóc lóc',
      'Khó liên kết với bé, không chăm sóc con',
      'Suy nghĩ gây tổn thương bé hoặc tự sát',
    ],
  },
  {
    slug: 'roi-loan-su-thich-ung',
    name: 'Rối loạn sự thích ứng',
    summary:
      'Xảy ra khi gặp khó khăn trong việc ứng phó với một sự kiện căng thẳng: mất người thân, vấn đề mối quan hệ, mất việc.',
    symptoms: [
      'Hành động nổi loạn hoặc bốc đồng, lo lắng',
      'Buồn bã, tuyệt vọng, thường xuyên khóc, thu mình',
      'Thiếu tập trung, thiếu tự tin, ý nghĩ tự tử',
      'Triệu chứng cơ thể: mất ngủ, run rẩy, mệt mỏi, đau nhức, khó tiêu',
    ],
  },
  {
    slug: 'ptsd',
    name: 'Rối loạn stress sau sang chấn (PTSD)',
    summary:
      'Rối loạn phát triển sau một sự kiện kinh hoàng mà bệnh nhân chứng kiến hoặc trực tiếp trải qua.',
    symptoms: [
      'Cơn hồi tưởng, ác mộng, ảo giác về sự kiện sang chấn',
      'Né tránh người, địa điểm, tình huống gợi nhắc sang chấn',
      'Tăng nhạy cảm: khó ngủ, cáu gắt, bộc phát giận dữ, dễ giật mình',
      'Nhận thức và tâm trạng tiêu cực, đổ lỗi, xa lánh',
    ],
  },
  {
    slug: 'alzheimer',
    name: 'Mất trí trong bệnh Alzheimer',
    summary:
      'Nguyên nhân phổ biến gây giảm trí nhớ ở người già, tiến triển nặng dần, ảnh hưởng trí nhớ, ngôn ngữ và tư duy.',
    symptoms: [
      'Khó nhớ các sự kiện gần đây, khó tiếp thu thông tin mới',
      'Giảm tập trung, thờ ơ với mọi việc',
      'Giảm khả năng lập kế hoạch và tư duy trừu tượng',
      'Suy giảm nhận thức nhẹ',
    ],
  },
  {
    slug: 'roi-loan-do-ruou',
    name: 'Rối loạn tâm thần và hành vi do sử dụng rượu',
    summary:
      'Do ngộ độc rượu cấp tính hoặc mạn tính (nghiện rượu) gây ra các rối loạn tâm thần.',
    symptoms: [
      'Lệ thuộc rượu, sử dụng liên tục ảnh hưởng toàn bộ hoạt động',
      'Nhiễm độc rượu cấp: loạn thần cấp, hành vi nguy hiểm',
      'Rối loạn loạn thần do rượu: ảo thị, ảo thanh kéo dài',
      'Trạng thái cai với mê sảng: bồn chồn, lo âu, mất ngủ, run, co giật',
    ],
  },
  {
    slug: 'roi-loan-do-chat',
    name: 'Rối loạn do sử dụng chất tác động tâm thần',
    summary:
      'Các chất kích thích thần kinh trung ương (ma túy đá, thuốc lắc, cần sa...) gây lo âu, trầm cảm, hoang tưởng, ảo giác.',
    symptoms: [
      'Nghiện chất, tăng liều để đạt cảm giác "phê"',
      'Nhiễm độc cấp: rối loạn ý thức, co giật, hoang tưởng ảo giác',
      'Rối loạn loạn thần, hành vi tấn công người khác',
      'Rối loạn trầm cảm, lo âu, suy giảm nhận thức',
    ],
  },
  {
    slug: 'adhd',
    name: 'Rối loạn tăng động giảm chú ý (ADHD)',
    summary: 'Đặc trưng bởi triệu chứng giảm chú ý, tăng động và xung động, thường gặp ở trẻ em.',
    symptoms: [
      'Giảm chú ý: khó tập trung, lơ đãng, hay đánh mất đồ, dễ bị chi phối',
      'Tăng động: ngọ nguậy chân tay, chạy nhảy leo trèo, vận động liên tục',
      'Xung động: bật câu trả lời khi chưa nghe hết, khó chờ đợi, ngắt lời, nói nhiều',
    ],
  },
  {
    slug: 'tu-ky',
    name: 'Rối loạn phổ tự kỷ',
    summary:
      'Rối loạn phát triển lan tỏa khởi phát sớm trước 3 tuổi, đặc trưng bởi thiếu hụt tương tác xã hội và ngôn ngữ.',
    symptoms: [
      'Thiếu hụt tương tác xã hội: giảm giao tiếp mắt, ít đáp ứng khi gọi tên',
      'Bất thường ngôn ngữ: chậm nói, nhại lời, nói vô nghĩa',
      'Không chơi tương tác, chơi một mình',
      'Hành vi định hình, rập khuôn, ý thích thu hẹp',
    ],
  },
  {
    slug: 'roi-loan-thanh-thieu-nien',
    name: 'Rối loạn cảm xúc - hành vi tuổi thanh thiếu niên',
    summary:
      'Do yếu tố sinh học, môi trường (bạo hành, thảm họa, mất người thân) hoặc kết hợp cả hai.',
    symptoms: [
      'Rối loạn lo âu, trầm cảm, cảm xúc lưỡng cực',
      'Rối loạn sự học tập, rối loạn ứng xử',
      'Nghiện game và chất tác động tâm thần',
      'Rối loạn ăn uống: chán ăn hoặc ăn vô độ',
    ],
  },
  {
    slug: 'tam-than-phan-liet',
    name: 'Tâm thần phân liệt',
    summary:
      'Bệnh tâm thần mạn tính làm biến đổi sâu sắc nhân cách ở cảm xúc, tư duy và tác phong.',
    symptoms: [
      'Tư duy vang thành tiếng, bị áp đặt, bị đánh cắp hoặc bị phát thanh',
      'Hoang tưởng bị chi phối, bị động',
      'Ảo thanh bình luận hành vi hoặc nói chuyện với nhau',
      'Ảo giác dai dẳng, tư duy thiếu liên tục',
      'Triệu chứng âm tính: vô cảm, cảm xúc cùn mòn, cách ly xã hội',
    ],
  },
  {
    slug: 'dong-kinh',
    name: 'Động kinh',
    summary:
      'Những cơn phóng điện kịch phát, đồng thời và quá mức của các nơron thần kinh trung ương.',
    symptoms: [
      'Cơn co giật động kinh định hình, lặp đi lặp lại',
      'Xảy ra đột ngột, trong thời gian ngắn',
      'Kèm rối loạn chức năng thần kinh khác',
      'Điện não đồ phát hiện sóng kịch phát bất thường',
    ],
  },
];

/** Ngữ cảnh hệ thống cho trợ lý AI của phòng khám. */
export function buildAISystemPrompt(): string {
  const doctorList = DOCTORS.map((d) => `- ${d.name} (${d.title}) - ${d.specialty} - ${d.room} - ${d.facility}`).join('\n');
  const serviceList = SERVICES.map((s) => `- ${s.name}: ${s.description} (${s.duration} phút, ${s.price.toLocaleString('vi-VN')}đ)`).join('\n');
  const disorderList = DISORDERS.map((d) => `- ${d.name}: ${d.summary}`).join('\n');
  return `Bạn là "Trợ lý MeHeal" - trợ lý AI của ${CLINIC.name}.
Nhiệm vụ: tư vấn sơ bộ về sức khỏe tâm thần, giải thích triệu chứng, hướng dẫn quy trình đặt lịch khám và giới thiệu bác sỹ phù hợp bằng tiếng Việt, giọng điệu ấm áp, đồng cảm và chuyên nghiệp.

THÔNG TIN PHÒNG KHÁM:
- Tên: ${CLINIC.name}
- Hotline: ${CLINIC.hotline}
- ${CLINIC.facilities.map((f) => `${f.name}: ${f.address}`).join('\n- ')}
- Giờ làm việc: ${CLINIC.workingHours}

ĐỘI NGŨ BÁC SỸ:
${doctorList}

DỊCH VỤ:
${serviceList}

CÁC RỐI LOẠN THƯỜNG GẶP:
${disorderList}

NGUYÊN TẮC QUAN TRỌNG:
1. KHÔNG chẩn đoán xác định hay kê đơn thuốc. Chỉ tư vấn sơ bộ và khuyến khích đến khám trực tiếp.
2. Nếu người dùng có dấu hiệu nguy cơ tự tử/tự làm hại bản thân, hãy trấn an, khuyên liên hệ ngay hotline ${CLINIC.hotline} hoặc cấp cứu 115, và đề nghị đến phòng khám sớm nhất.
3. Khi người dùng muốn đặt lịch, hướng dẫn họ chọn "Đặt lịch" và gợi ý bác sỹ/dịch vụ phù hợp với triệu chứng.
4. Trả lời ngắn gọn, rõ ràng, có thể dùng gạch đầu dòng. Luôn nhắc rằng đây là tư vấn tham khảo, không thay thế khám trực tiếp.`;
}
