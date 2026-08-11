import { ModalPickerSheet, ModalPickerSheetProps } from '../ModalPickerSheet';

describe('ModalPickerSheet Component Suite', () => {
  interface SampleItem {
    id: string;
    nama: string;
  }

  const sampleItems: SampleItem[] = [
    { id: '1', nama: 'Budi' },
    { id: '2', nama: 'Siti' },
  ];

  it('1. render props dasar (title, items list, & close button handler)', () => {
    const props: ModalPickerSheetProps<SampleItem> = {
      visible: true,
      onClose: jest.fn(),
      title: 'Pilih Supervisor',
      searchQuery: '',
      onSearchQueryChange: jest.fn(),
      items: sampleItems,
      keyExtractor: (item) => item.id,
      renderItem: (item) => item.nama as unknown as React.ReactNode,
      closeTestID: 'button-close-test',
    };

    const element = ModalPickerSheet(props);
    expect(element.type).toBeDefined();

    const sheetContainer = element.props.children.props.children;
    const headerRow = sheetContainer.props.children[0];
    const titleText = headerRow.props.children[0].props.children;
    const closeBtn = headerRow.props.children[1];

    expect(titleText).toBe('Pilih Supervisor');
    expect(closeBtn.props.testID).toBe('button-close-test');

    closeBtn.props.onPress();
    expect(props.onClose).toHaveBeenCalled();
  });

  it('2. render error banner saat prop error terisi', () => {
    const props: ModalPickerSheetProps<SampleItem> = {
      visible: true,
      onClose: jest.fn(),
      title: 'Pilih Supervisor',
      error: 'ROLE_BUKAN_SUPERVISOR',
      errorTestID: 'banner-assign-error',
      searchQuery: '',
      onSearchQueryChange: jest.fn(),
      items: [],
      keyExtractor: (item) => item.id,
      renderItem: (item) => item.nama as unknown as React.ReactNode,
    };

    const element = ModalPickerSheet(props);
    const sheetContainer = element.props.children.props.children;
    const errorContainer = sheetContainer.props.children[1];

    expect(errorContainer).toBeTruthy();
    expect(errorContainer.props.children.props.message).toBe('ROLE_BUKAN_SUPERVISOR');
  });

  it('3. render opsi allOptionLabel ("Semua Karyawan") saat diberikan', () => {
    const onSelectAll = jest.fn();
    const props: ModalPickerSheetProps<SampleItem> = {
      visible: true,
      onClose: jest.fn(),
      title: 'Pilih Karyawan',
      searchQuery: '',
      onSearchQueryChange: jest.fn(),
      items: sampleItems,
      keyExtractor: (item) => item.id,
      renderItem: (item) => item.nama as unknown as React.ReactNode,
      allOptionLabel: 'Semua Karyawan',
      allOptionTestID: 'option-all-karyawan',
      onSelectAllOption: onSelectAll,
      isAllOptionSelected: true,
    };

    const element = ModalPickerSheet(props);
    const sheetContainer = element.props.children.props.children;
    const allOptionBtn = sheetContainer.props.children[3];

    expect(allOptionBtn).toBeTruthy();
    expect(allOptionBtn.props.testID).toBe('option-all-karyawan');
    expect(allOptionBtn.props.style).toEqual({
      backgroundColor: 'rgba(255, 200, 30, 0.15)',
      borderColor: '#FFC81E',
    });

    allOptionBtn.props.onPress();
    expect(onSelectAll).toHaveBeenCalled();
  });

  it('4. render empty state dengan custom emptyIcon saat items kosong', () => {
    const props: ModalPickerSheetProps<SampleItem> = {
      visible: true,
      onClose: jest.fn(),
      title: 'Pilih Site',
      searchQuery: '',
      onSearchQueryChange: jest.fn(),
      items: [],
      keyExtractor: (item) => item.id,
      renderItem: (item) => item.nama as unknown as React.ReactNode,
      emptyTitle: 'Tidak Ada Site',
      emptyDescription: 'Belum ada data site.',
      emptyIcon: 'business-outline',
    };

    const element = ModalPickerSheet(props);
    const sheetContainer = element.props.children.props.children;
    const bodyContent = sheetContainer.props.children[4];

    expect(bodyContent.props.children[0].props.name).toBe('business-outline');
    expect(bodyContent.props.children[1].props.children).toBe('Tidak Ada Site');
  });
});
